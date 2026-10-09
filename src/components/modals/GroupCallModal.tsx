import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  AlertCircle,
  Radio,
  PhoneCall,
  Loader2
} from 'lucide-react';
import { UserProfile, GroupCallSession, GroupMember } from '../../types';
import { api } from '../../services/api';
import { soundService } from '../../services/soundService';
import { triggerHaptic, triggerHapticNotification } from '../../services/nativeService';

interface GroupCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callSession: GroupCallSession | null;
  currentUser: UserProfile;
  groupName: string;
  groupMembers?: GroupMember[];
  onCallTimeout?: (message: string) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  isOpen,
  onClose,
  callSession,
  currentUser,
  groupName,
  groupMembers = [],
  onCallTimeout,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callSession?.type === 'audio');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [ringingCountdown, setRingingCountdown] = useState(35);
  const [isJitsiLoading, setIsJitsiLoading] = useState(true);
  const [jitsiError, setJitsiError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>(currentUser.id);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const maxJoinedCountRef = useRef<number>(1);
  const isTerminatedRef = useRef<boolean>(false);

  const participants = callSession?.participants || [];
  const isInitiator = callSession?.initiatorId === currentUser.id;
  const isAloneInRoom = participants.length <= 1;

  // Décompte de la durée de l'appel
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callSession?.active]);

  // Sonnerie / Tonalité d'attente pour l'initiateur tant que personne n'a décroché
  useEffect(() => {
    let stopTone: (() => void) | null = null;
    if (isOpen && isInitiator && isAloneInRoom) {
      stopTone = soundService.startDialingTone();
    }
    return () => {
      if (stopTone) stopTone();
      soundService.stopRingtone();
    };
  }, [isOpen, isInitiator, isAloneInRoom]);

  // Compte à rebours de sonnerie initial de 35s si personne ne décroche
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;
    if (participants.length >= 2) {
      setRingingCountdown(35);
      return;
    }

    setRingingCountdown(35);
    const ringInterval = setInterval(() => {
      setRingingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(ringInterval);
          if (isInitiator) {
            soundService.playFailureSound();
            if (callSession?.groupId && callSession?.callId) {
              api.timeoutCall(callSession.groupId, callSession.callId).catch(() => {});
            }
          }
          handleHangUp("Aucun membre n'a répondu à l'appel.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ringInterval);
  }, [isOpen, callSession?.active, participants.length, isInitiator, callSession?.groupId, callSession?.callId]);

  // Raccrocher / Quitter le salon
  const handleHangUp = useCallback(async (reason?: string) => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;
    triggerHaptic('medium');

    if (isInitiator && isAloneInRoom && maxJoinedCountRef.current <= 1) {
      soundService.playFailureSound();
      if (callSession?.groupId && callSession?.callId) {
        api.timeoutCall(callSession.groupId, callSession.callId).catch(() => {});
      }
    } else {
      soundService.playLeaveSound();
    }

    soundService.stopRingtone();

    // Nettoyage Jitsi API
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.dispose();
      } catch (_) {}
      jitsiApiRef.current = null;
    }

    // Nettoyage flux audio local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    if (callSession?.groupId && callSession?.callId) {
      await api.leaveCall(callSession.groupId, callSession.callId, currentUser.id).catch(() => {});
    }

    setCallDuration(0);
    if (reason && onCallTimeout) {
      onCallTimeout(reason);
    }
    onClose();
  }, [isInitiator, isAloneInRoom, callSession?.groupId, callSession?.callId, currentUser.id, onClose, onCallTimeout]);

  // Initialisation de l'analyseur de voix local pour le halo dynamique
  useEffect(() => {
    if (!isOpen) return;

    let localStream: MediaStream | null = null;
    const startAudioDetection = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = localStream;
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(localStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const speakingNow = avg > 16 && !isMuted;
            setIsSpeaking(speakingNow);
            if (speakingNow) {
              setActiveSpeakerId(currentUser.id);
            }
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (_) {
        // Détection audio
      }
    };

    startAudioDetection();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isOpen, isMuted, currentUser.id]);

  // Chargement dynamique du script Jitsi Meet External API et instanciation du salon
  useEffect(() => {
    if (!isOpen || !callSession) return;
    isTerminatedRef.current = false;
    maxJoinedCountRef.current = 1;
    setIsJitsiLoading(true);
    setJitsiError(null);

    const isAudioOnly = callSession.type === 'audio';
    setIsVideoOff(isAudioOnly);

    const initJitsiRoom = () => {
      if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (_) {}
      }

      const domain = 'meet.jit.si';
      const cleanGroupId = (callSession.groupId || 'default').replace(/[^a-zA-Z0-9]/g, '');
      const cleanCallId = (callSession.callId || 'call').replace(/[^a-zA-Z0-9]/g, '');
      const roomName = `Outlys_${cleanGroupId}_${cleanCallId}`;

      const displayName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Membre Outlys';

      const toolbarButtons = isAudioOnly
        ? ['microphone', 'hangup', 'tileview', 'fullscreen', 'chat', 'raisehand', 'participants-pane']
        : ['microphone', 'camera', 'hangup', 'tileview', 'fullscreen', 'chat', 'raisehand', 'participants-pane', 'select-background'];

      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName,
          email: currentUser.email || `${currentUser.id}@outlys.app`,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: isAudioOnly,
          startAudioOnly: isAudioOnly,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          enableWelcomePage: false,
          enableClosePage: false,
          disableThirdPartyRequests: true,
          toolbarButtons,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: toolbarButtons,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Membre Outlys',
          DEFAULT_LOCAL_DISPLAY_NAME: `${currentUser.firstName || 'Moi'} (Vous)`,
          MOBILE_APP_PROMO: false,
          HIDE_DEEP_LINKING_LOGO: true,
        },
      };

      try {
        const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = apiInstance;
        setIsJitsiLoading(false);

        apiInstance.addEventListener('videoMuteStatusChanged', (e: any) => {
          setIsVideoOff(Boolean(e.muted));
        });

        apiInstance.addEventListener('audioMuteStatusChanged', (e: any) => {
          setIsMuted(Boolean(e.muted));
        });

        apiInstance.addEventListener('dominantSpeakerChanged', (e: any) => {
          if (e.id) {
            setActiveSpeakerId(e.id);
          }
        });

        apiInstance.addEventListener('participantJoined', (e: any) => {
          soundService.playJoinSound();
          triggerHapticNotification('success');
          try {
            const count = apiInstance.getNumberOfParticipants();
            if (count > maxJoinedCountRef.current) {
              maxJoinedCountRef.current = count;
            }
          } catch (_) {
            maxJoinedCountRef.current = Math.max(maxJoinedCountRef.current, 2);
          }
        });

        // Règle de fermeture automatique dès que le dernier correspondant raccroche
        apiInstance.addEventListener('participantLeft', () => {
          try {
            const remainingCount = apiInstance.getNumberOfParticipants();
            if (remainingCount <= 1 && maxJoinedCountRef.current >= 2) {
              handleHangUp("Tous les participants ont quitté le salon.");
            }
          } catch (_) {}
        });

        apiInstance.addEventListener('readyToClose', () => {
          handleHangUp();
        });
      } catch (err: any) {
        console.error('Erreur initialisation Jitsi Meet:', err);
        setJitsiError("Impossible de charger le salon d'appel Jitsi Meet.");
        setIsJitsiLoading(false);
      }
    };

    if (window.JitsiMeetExternalAPI) {
      initJitsiRoom();
    } else {
      const existingScript = document.getElementById('jitsi-external-api-script');
      if (existingScript) {
        existingScript.onload = () => initJitsiRoom();
      } else {
        const script = document.createElement('script');
        script.id = 'jitsi-external-api-script';
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => initJitsiRoom();
        script.onerror = () => {
          setJitsiError("Impossible de charger le moteur d'appel vidéo Jitsi.");
          setIsJitsiLoading(false);
        };
        document.body.appendChild(script);
      }
    }

    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (_) {}
        jitsiApiRef.current = null;
      }
    };
  }, [isOpen, callSession?.groupId, callSession?.callId, callSession?.type, currentUser, handleHangUp]);

  const toggleMute = () => {
    triggerHaptic('light');
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (callSession?.type === 'audio') return;
    triggerHaptic('light');
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  };

  const toggleSpeaker = () => {
    triggerHaptic('light');
    setIsSpeakerOn(!isSpeakerOn);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !callSession) return null;

  const waitingMembers = groupMembers.filter((m) => {
    const uid = m.userId || m.id;
    return uid && uid !== currentUser.id;
  });

  // 1. Vue Flottante Réduite (Picture-in-Picture)
  if (isMinimized) {
    return (
      <div
        id="call-floating-pip"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-3 p-3 rounded-2xl bg-[#18181B] text-[#FFF9EB] border border-zinc-700 shadow-2xl animate-fade-in cursor-pointer select-none"
        onClick={() => setIsMinimized(false)}
      >
        <div className="relative">
          <img
            src={currentUser.avatar || '/Avatar_Herisson.jpg'}
            alt="Avatar"
            className={`w-10 h-10 rounded-full object-cover ring-2 ${
              isSpeaking ? 'ring-emerald-400' : 'ring-[#5D0D18]'
            }`}
          />
          {isSpeaking && (
            <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="truncate max-w-[120px]">{groupName}</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {formatDuration(callDuration)}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-300'
            }`}
            title={isMuted ? 'Activer le micro' : 'Couper le micro'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleHangUp()}
            className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Quitter l'appel"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Agrandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Vue Plein Écran du Salon Jitsi Meet
  return (
    <div
      id="group-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-fade-in select-none"
    >
      <div className="relative w-full max-w-4xl h-[92dvh] max-h-[820px] flex flex-col justify-between rounded-3xl bg-[#18181B] border border-zinc-800 text-[#FFF9EB] shadow-2xl overflow-hidden">
        {/* Barre Supérieure du Salon Épurée */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#5D0D18]/40 text-amber-200">
              {callSession.type === 'video' ? <Video className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-md font-serif">
                  {groupName}
                </h3>
                {isAloneInRoom && (
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    Sonnerie ({ringingCountdown}s)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>{callSession.type === 'video' ? 'Salon vidéo' : 'Salon audio'}</span>
                <span>•</span>
                <span className="font-mono font-medium text-emerald-400">{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Réduire l'appel et naviguer dans l'application"
              className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message d'erreur Jitsi si échec de chargement */}
        {jitsiError && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center gap-2 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{jitsiError}</span>
          </div>
        )}

        {/* Conteneur Jitsi Meet intégré */}
        <div className="relative flex-1 w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {isJitsiLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-300 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-300" />
              <p className="text-xs font-semibold text-zinc-300">Connexion au salon d'appel...</p>
            </div>
          )}

          {/* Salon Jitsi Meet iframe injecté */}
          <div ref={jitsiContainerRef} className="w-full h-full" />

          {/* Bandeau d'attente d'autres membres si seul dans l'appel */}
          {isAloneInRoom && !isJitsiLoading && (
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-2 backdrop-blur-md pointer-events-none z-10 animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>Appel en cours • En attente des membres</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {waitingMembers.slice(0, 6).map((m) => (
                  <div key={m.userId || m.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs">
                    <img
                      src={m.avatar || '/Avatar_Herisson.jpg'}
                      alt={m.firstName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="text-zinc-300 text-[11px]">{m.firstName || m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barre Inférieure de Contrôles Unifiée */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 px-3 sm:px-6 py-3 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-md z-10">
          {/* Couper / Activer Micro */}
          <button
            type="button"
            id="call-btn-toggle-mic"
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-750 border border-zinc-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            <span className="text-[10px] sm:text-xs">{isMuted ? 'Coupé' : 'Micro'}</span>
          </button>

          {/* Caméra uniquement pour les appels vidéo (verrouillé et masqué en audio) */}
          {callSession.type === 'video' && (
            <button
              type="button"
              id="call-btn-toggle-video"
              onClick={toggleVideo}
              className={`flex flex-col items-center gap-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
                isVideoOff
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 border border-zinc-700'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              <span className="text-[10px] sm:text-xs">{isVideoOff ? 'Sans vidéo' : 'Caméra'}</span>
            </button>
          )}

          {/* Haut-parleur / Écouteur */}
          <button
            type="button"
            id="call-btn-toggle-speaker"
            onClick={toggleSpeaker}
            className={`flex flex-col items-center gap-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isSpeakerOn
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-750 border border-zinc-700'
                : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800'
            }`}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5 text-amber-300" /> : <VolumeX className="w-5 h-5" />}
            <span className="text-[10px] sm:text-xs">{isSpeakerOn ? 'Haut-parleur' : 'Écouteur'}</span>
          </button>

          {/* Raccrocher / Annuler */}
          <button
            type="button"
            id="call-btn-hangup"
            onClick={() => handleHangUp()}
            className="flex flex-col items-center gap-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[10px] sm:text-xs">
              {isInitiator && isAloneInRoom ? 'Annuler' : 'Raccrocher'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
