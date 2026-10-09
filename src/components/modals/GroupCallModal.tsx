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
  PhoneCall,
  Radio,
  Users
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
  const [localSpeaking, setLocalSpeaking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const maxJoinedCountRef = useRef<number>(1);
  const isTerminatedRef = useRef<boolean>(false);
  const lastSpeakingStateRef = useRef<boolean>(false);
  const lastSpeakingSendTimeRef = useRef<number>(0);

  const participants = callSession?.participants || [];
  const isInitiator = callSession?.initiatorId === currentUser.id;
  const isAloneInRoom = participants.length <= 1;

  // Track the highest number of participants who joined
  useEffect(() => {
    if (participants.length > maxJoinedCountRef.current) {
      maxJoinedCountRef.current = participants.length;
      if (participants.length >= 2) {
        soundService.playJoinSound();
        triggerHapticNotification('success');
      }
    }
  }, [participants.length]);

  // Fermeture automatique stricte : dès qu'il ne reste qu'une seule personne après qu'au moins 2 ont rejoint
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;
    if (maxJoinedCountRef.current >= 2 && participants.length <= 1 && !isTerminatedRef.current) {
      handleHangUp("Tous les autres participants ont quitté l'appel.");
    }
  }, [isOpen, callSession?.active, participants.length]);

  // Décompte de la durée de l'appel
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callSession?.active]);

  // Tonalité d'attente pour l'initiateur tant que personne d'autre n'a rejoint
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

    // Nettoyage flux audio/vidéo local
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

  // Initialisation du flux multimédia et détection de prise de parole (analyseur audio Web Audio)
  useEffect(() => {
    if (!isOpen) return;
    isTerminatedRef.current = false;

    let mounted = true;
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callSession?.type === 'video' && !isVideoOff,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        if (localVideoRef.current && callSession?.type === 'video' && !isVideoOff) {
          localVideoRef.current.srcObject = stream;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current || !mounted) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const speakingNow = avg > 16 && !isMuted;
            setLocalSpeaking(speakingNow);

            const now = Date.now();
            if (
              speakingNow !== lastSpeakingStateRef.current &&
              now - lastSpeakingSendTimeRef.current > 300 &&
              callSession?.groupId &&
              callSession?.callId
            ) {
              lastSpeakingStateRef.current = speakingNow;
              lastSpeakingSendTimeRef.current = now;
              api.updateCallState(callSession.groupId, callSession.callId, currentUser.id, {
                isSpeaking: speakingNow,
              }).catch(() => {});
            }

            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (err) {
        console.warn('[Call] Accès micro/caméra:', err);
      }
    };

    startMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isOpen, callSession?.type, callSession?.groupId, callSession?.callId, currentUser.id, isMuted, isVideoOff]);

  // Basculer Micro (Coupé / Actif)
  const toggleMute = () => {
    triggerHaptic('light');
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (callSession?.groupId && callSession?.callId) {
      api.updateCallState(callSession.groupId, callSession.callId, currentUser.id, {
        isMuted: nextMuted,
        isSpeaking: false,
      }).catch(() => {});
    }
  };

  // Basculer Caméra (uniquement en appel vidéo)
  const toggleVideo = () => {
    if (callSession?.type === 'audio') return;
    triggerHaptic('light');
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
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

  // Liste des membres du groupe en attente si appel non rejoint par d'autres
  const waitingMembers = groupMembers.filter((m) => {
    const uid = m.userId || m.id;
    return uid && uid !== currentUser.id && !participants.some((p) => p.userId === uid);
  });

  // Vue Flottante Réduite (Picture-in-Picture)
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
            className={`w-10 h-10 rounded-full object-cover ring-2 transition-all ${
              localSpeaking ? 'ring-emerald-400 scale-105' : 'ring-[#5D0D18]'
            }`}
          />
          {localSpeaking && (
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
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-300'
            }`}
            title={isMuted ? 'Activer le micro' : 'Couper le micro'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleHangUp()}
            className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
            title="Quitter l'appel"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            title="Agrandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Vue Plein Écran du Salon Intégré Outlys
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
                <span>•</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length} participant{participants.length > 1 ? 's' : ''}
                </span>
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

        {/* Grille Intégrée des Participants Outlys */}
        <div className="relative flex-1 w-full h-full min-h-0 bg-zinc-950 p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-center">
          <div
            className={`w-full max-w-3xl grid gap-4 place-items-center ${
              participants.length <= 1
                ? 'grid-cols-1 max-w-sm'
                : participants.length === 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                : participants.length <= 4
                ? 'grid-cols-2 max-w-2xl'
                : 'grid-cols-2 sm:grid-cols-3 max-w-3xl'
            }`}
          >
            {/* Carte de chaque participant présent */}
            {participants.map((p) => {
              const isMe = p.userId === currentUser.id;
              const participantMuted = isMe ? isMuted : Boolean(p.isMuted || p.muted);
              const participantSpeaking = isMe ? localSpeaking : Boolean(p.isSpeaking);

              return (
                <div
                  key={p.userId}
                  className={`relative w-full aspect-square max-w-[240px] rounded-3xl bg-zinc-900/90 border transition-all duration-300 flex flex-col items-center justify-center p-4 shadow-xl overflow-hidden ${
                    participantSpeaking
                      ? 'border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.35)] scale-[1.02]'
                      : 'border-zinc-800'
                  }`}
                >
                  {/* Flux vidéo local si vidéo activée */}
                  {isMe && callSession.type === 'video' && !isVideoOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                    />
                  ) : null}

                  {/* Avatar & Halo Vocal */}
                  <div className="relative flex items-center justify-center my-auto">
                    {/* Halo vocal rayonnant animé */}
                    {participantSpeaking && (
                      <>
                        <span className="absolute -inset-3 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />
                        <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-pulse pointer-events-none" />
                      </>
                    )}

                    <img
                      src={p.userAvatar || '/Avatar_Herisson.jpg'}
                      alt={p.userName}
                      className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 transition-all duration-200 ${
                        participantSpeaking
                          ? 'ring-emerald-400 shadow-lg shadow-emerald-500/50'
                          : 'ring-zinc-700'
                      }`}
                    />

                    {/* Badge Micro barré ou actif */}
                    <div
                      className={`absolute -bottom-1 -right-1 z-20 p-1.5 rounded-full border-2 border-zinc-900 shadow-md ${
                        participantMuted
                          ? 'bg-red-500 text-white'
                          : participantSpeaking
                          ? 'bg-emerald-500 text-white animate-bounce'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                      title={participantMuted ? 'Micro coupé' : 'Micro actif'}
                    >
                      {participantMuted ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Nom du participant */}
                  <div className="relative z-10 mt-auto pt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-sm max-w-full">
                    <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                      {p.userName} {isMe ? '(Vous)' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bandeau d'attente d'autres membres si seul dans l'appel */}
          {isAloneInRoom && (
            <div className="mt-8 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-2 backdrop-blur-md max-w-md w-full animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>Appel en cours • En attente des membres</span>
              </div>
              {waitingMembers.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {waitingMembers.slice(0, 6).map((m) => (
                    <div
                      key={m.userId || m.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
                    >
                      <img
                        src={m.avatar || '/Avatar_Herisson.jpg'}
                        alt={m.firstName}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-[11px] font-medium">{m.firstName || m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barre Inférieure de Contrôles Unifiée */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-md z-10">
          {/* Couper / Activer Micro */}
          <button
            type="button"
            id="call-btn-toggle-mic"
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
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
              className={`flex flex-col items-center gap-1 px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
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
            className={`flex flex-col items-center gap-1 px-3 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
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
            className="flex flex-col items-center gap-1 px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
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
