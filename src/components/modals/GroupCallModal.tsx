import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  RefreshCw,
  Users,
  Volume2,
  VolumeX,
  AlertCircle,
  Radio,
  Clock,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { UserProfile, CallParticipant, GroupCallSession, GroupMember } from '../../types';
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [ringingCountdown, setRingingCountdown] = useState(35);
  const [solitaryCountdown, setSolitaryCountdown] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>(currentUser.id);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevParticipantsCountRef = useRef<number>(0);

  // Synchronisation du mode vidéo initial
  useEffect(() => {
    if (callSession?.type) {
      setIsVideoOff(callSession.type === 'audio');
    }
  }, [callSession?.type]);

  // Décompte de la durée de l'appel
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callSession?.active]);

  const participants = callSession?.participants || [];
  const isInitiator = callSession?.initiatorId === currentUser.id;
  const isAloneInRoom = participants.length <= 1;

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

  // Détection des arrivées de nouveaux participants (bip sonore joyeux)
  useEffect(() => {
    if (participants.length > prevParticipantsCountRef.current && prevParticipantsCountRef.current > 0) {
      soundService.playJoinSound();
      triggerHapticNotification('success');
    }
    prevParticipantsCountRef.current = participants.length;
  }, [participants.length]);

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
          // Expiration du délai sans réponse -> son d'échec et clôture « Appel manqué »
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

  // Règle 15 secondes d'attente automatique s'il ne reste plus qu'un seul membre après des départs
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;

    // S'il n'y a qu'un membre mais que l'appel a déjà duré plus de 5s et qu'il y a eu d'autres participants
    const hadOthers = (callSession.allJoinedUserIds || []).length >= 2;
    if (participants.length === 1 && hadOthers) {
      setSolitaryCountdown(15);
      const solitaryInterval = setInterval(() => {
        setSolitaryCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(solitaryInterval);
            handleHangUp("Tous les participants ont quitté le salon.");
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(solitaryInterval);
    } else {
      setSolitaryCountdown(null);
    }
  }, [isOpen, callSession?.active, participants.length, (callSession?.allJoinedUserIds || []).length]);

  // Initialisation des flux médias (Microphone & Caméra WebRTC)
  const initMedia = useCallback(async () => {
    setPermissionError(null);
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const wantVideo = callSession?.type === 'video' && !isVideoOff;
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: wantVideo
          ? {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && wantVideo) {
        localVideoRef.current.srcObject = stream;
      }

      // Analyseur audio pour le halo lumineux de parole en direct
      try {
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
      } catch (audioErr) {
        console.warn('AudioContext volume analyser non disponible:', audioErr);
      }
    } catch (err: any) {
      console.error('Erreur accès caméra/micro:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError("Veuillez autoriser l'accès au microphone et à la caméra.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError("Aucun microphone ou caméra détecté.");
      } else {
        setPermissionError("Impossible d'accéder aux périphériques médias.");
      }
    }
  }, [callSession?.type, isVideoOff, facingMode, isMuted, currentUser.id]);

  useEffect(() => {
    if (isOpen) {
      initMedia();
      triggerHapticNotification('success');
    }
    return () => {
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
    };
  }, [isOpen, initMedia]);

  // Couper / Activer le micro
  const toggleMute = () => {
    triggerHaptic('light');
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Activer / Désactiver la caméra
  const toggleVideo = async () => {
    triggerHaptic('light');
    const nextVideoState = !isVideoOff;
    setIsVideoOff(nextVideoState);
    if (nextVideoState) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.stop();
          localStreamRef.current?.removeTrack(track);
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];
        if (localStreamRef.current && newVideoTrack) {
          localStreamRef.current.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
      } catch (err) {
        console.warn('Impossible de réactiver la caméra:', err);
      }
    }
  };

  // Basculer caméra avant / arrière
  const switchCamera = async () => {
    triggerHaptic('light');
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
  };

  // Basculer Haut-parleur / Écouteur
  const toggleSpeaker = () => {
    triggerHaptic('light');
    setIsSpeakerOn(!isSpeakerOn);
  };

  // Raccrocher / Quitter le salon
  const handleHangUp = async (reason?: string) => {
    triggerHaptic('medium');
    
    // Si l'initiateur raccroche alors que personne n'a encore rejoint
    if (isInitiator && isAloneInRoom) {
      soundService.playFailureSound();
      if (callSession?.groupId && callSession?.callId) {
        api.timeoutCall(callSession.groupId, callSession.callId).catch(() => {});
      }
    } else {
      soundService.playLeaveSound();
    }
    
    soundService.stopRingtone();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (callSession?.groupId && callSession?.callId) {
      await api.leaveCall(callSession.groupId, callSession.callId, currentUser.id).catch(() => {});
    }
    setCallDuration(0);
    if (reason && onCallTimeout) {
      onCallTimeout(reason);
    }
    onClose();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !callSession) return null;

  const otherParticipants = participants.filter((p) => p.userId !== currentUser.id);
  const totalCount = participants.length;

  // Calcul des membres du groupe absents de l'appel pour l'affichage de la liste de sonnerie
  const connectedUserIds = new Set(participants.map((p) => p.userId));
  const waitingMembers = groupMembers.filter((m) => {
    const uid = m.userId || m.id;
    return uid && !connectedUserIds.has(uid) && uid !== currentUser.id;
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
          <span className="text-[11px] text-zinc-400">
            {totalCount < 2 ? `Sonnerie (${ringingCountdown}s)` : `${totalCount} part. • ${formatDuration(callDuration)}`}
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

  // 2. Vue Plein Écran du Salon de discussion ouvert
  return (
    <div
      id="group-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-fade-in select-none"
    >
      <div className="relative w-full max-w-4xl h-[92dvh] max-h-[820px] flex flex-col justify-between rounded-3xl bg-[#18181B] border border-zinc-800 text-[#FFF9EB] shadow-2xl overflow-hidden">
        {/* Barre Supérieure du Salon */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#5D0D18]/30 text-amber-200">
              {callSession.type === 'video' ? <Video className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-md">
                  {groupName}
                </h3>
                {totalCount < 2 ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    Sonnerie ({ringingCountdown}s)
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Salon actif ({totalCount})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>{callSession.type === 'video' ? 'Salon vidéo ouvert' : 'Salon audio ouvert'}</span>
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

        {/* Bannière d'alerte : délai d'inactivité de 15s si un seul membre reste dans le salon */}
        {solitaryCountdown !== null && (
          <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between text-amber-200 text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Vous êtes seul dans le salon. Fermeture automatique dans <strong className="font-mono text-amber-300">{solitaryCountdown}s</strong>.</span>
            </div>
            <button
              type="button"
              onClick={() => setSolitaryCountdown(null)}
              className="text-[10px] underline font-bold hover:text-white"
            >
              Rester
            </button>
          </div>
        )}

        {/* Message d'erreur de permission */}
        {permissionError && (
          <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center gap-2 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Grille principale des participants (Audio & Vidéo) */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col justify-center items-center min-h-0">
          {/* Mode Audio ou Vidéo avec agencement dynamique selon le nombre de participants */}
          {callSession.type === 'audio' ? (
            /* AGENCEMENT AUDIO : Grille d'avatars avec halo lumineux animé */
            <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-6 my-auto">
              <div
                className={`w-full grid gap-4 sm:gap-6 justify-center items-center ${
                  totalCount === 1
                    ? 'grid-cols-1 max-w-xs'
                    : totalCount === 2
                    ? 'grid-cols-2 max-w-md'
                    : totalCount <= 4
                    ? 'grid-cols-2 sm:grid-cols-4 max-w-xl'
                    : 'grid-cols-3 sm:grid-cols-5'
                }`}
              >
                {/* Ma vignette audio */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-lg">
                  <div className="relative">
                    <img
                      src={currentUser.avatar || '/Avatar_Herisson.jpg'}
                      alt={currentUser.firstName}
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 transition-all duration-300 ${
                        isSpeaking
                          ? 'ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-105'
                          : 'ring-[#5D0D18]/80'
                      }`}
                    />
                    {isSpeaking && (
                      <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                    )}
                    {isMuted && (
                      <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-600 text-white shadow-md">
                        <MicOff className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <span className="mt-2.5 text-xs font-bold text-white truncate max-w-[100px]">
                    {currentUser.firstName} (Vous)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Connecté</span>
                </div>

                {/* Vignettes des autres correspondants connectés */}
                {otherParticipants.map((p) => {
                  const isOtherSpeaking = activeSpeakerId === p.userId;
                  return (
                    <div
                      key={p.userId}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-lg"
                    >
                      <div className="relative">
                        <img
                          src={p.userAvatar || '/Avatar_Herisson.jpg'}
                          alt={p.userName}
                          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 transition-all duration-300 ${
                            isOtherSpeaking
                              ? 'ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-105'
                              : 'ring-zinc-700'
                          }`}
                        />
                        {isOtherSpeaking && (
                          <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                        )}
                        {p.muted && (
                          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-600 text-white shadow-md">
                            <MicOff className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <span className="mt-2.5 text-xs font-bold text-white truncate max-w-[100px]">
                        {p.userName}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">En direct</span>
                    </div>
                  );
                })}
              </div>

              {/* Si seul dans le salon : liste des membres en attente avec statut de sonnerie */}
              {isAloneInRoom && (
                <div className="w-full p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>Appel de groupe en cours • Sonnerie chez les membres</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {waitingMembers.slice(0, 6).map((m) => (
                      <div key={m.userId || m.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs">
                        <img
                          src={m.avatar || '/Avatar_Herisson.jpg'}
                          alt={m.firstName}
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400"
                        />
                        <span className="text-zinc-200 font-medium">{m.firstName || m.name}</span>
                        <span className="text-[10px] text-amber-300 animate-pulse">Sonnerie...</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Les membres peuvent décrocher ou cliquer sur « Rejoindre » dans la discussion à tout moment.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* AGENCEMENT VIDÉO : 2 part. (50/50), 3-4 part. (grille 2x2), >4 part. (intervenant principal + vignettes) */
            <div className="w-full h-full flex flex-col justify-center items-center">
              {totalCount <= 2 ? (
                /* 1 ou 2 participants : disposition côte à côte ou plein écran */
                <div className={`w-full h-full grid gap-3 sm:gap-4 items-center justify-center ${
                  totalCount === 1 ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  {/* Ma caméra */}
                  <div className="relative w-full h-full min-h-[220px] max-h-[360px] flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-inner">
                    {!isVideoOff ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                    ) : (
                      <div className="relative flex flex-col items-center justify-center">
                        <div className="relative">
                          <img
                            src={currentUser.avatar || '/Avatar_Herisson.jpg'}
                            alt={currentUser.firstName}
                            className={`w-24 h-24 rounded-full object-cover ring-4 ${
                              isSpeaking ? 'ring-emerald-400' : 'ring-[#5D0D18]'
                            }`}
                          />
                          {isSpeaking && (
                            <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                          )}
                        </div>
                        <span className="mt-2 text-xs font-bold text-white">{currentUser.firstName} (Vous)</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-xs font-semibold text-white">
                      <span>{currentUser.firstName} (Vous)</span>
                      {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  </div>

                  {/* Autre participant */}
                  {otherParticipants.map((p) => (
                    <div
                      key={p.userId}
                      className="relative w-full h-full min-h-[220px] max-h-[360px] flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-inner"
                    >
                      <div className="relative flex flex-col items-center justify-center">
                        <div className="relative">
                          <img
                            src={p.userAvatar || '/Avatar_Herisson.jpg'}
                            alt={p.userName}
                            className={`w-24 h-24 rounded-full object-cover ring-4 ${
                              activeSpeakerId === p.userId ? 'ring-emerald-400' : 'ring-zinc-700'
                            }`}
                          />
                          {activeSpeakerId === p.userId && (
                            <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                          )}
                        </div>
                        <span className="mt-2 text-xs font-bold text-white">{p.userName}</span>
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-xs font-semibold text-white">
                        <span>{p.userName}</span>
                        {p.muted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : totalCount <= 4 ? (
                /* 3 ou 4 participants : disposition en grille symétrique 2x2 */
                <div className="w-full h-full grid grid-cols-2 gap-3 items-center justify-center">
                  <div className="relative w-full h-full min-h-[160px] flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                    {!isVideoOff ? (
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                    ) : (
                      <img src={currentUser.avatar || '/Avatar_Herisson.jpg'} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-[#5D0D18]" />
                    )}
                    <span className="absolute bottom-2 left-2 text-[11px] font-bold bg-black/60 px-2 py-0.5 rounded-full text-white">Vous</span>
                  </div>
                  {otherParticipants.map((p) => (
                    <div key={p.userId} className="relative w-full h-full min-h-[160px] flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <img src={p.userAvatar || '/Avatar_Herisson.jpg'} alt={p.userName} className="w-16 h-16 rounded-full object-cover ring-2 ring-zinc-700" />
                      <span className="absolute bottom-2 left-2 text-[11px] font-bold bg-black/60 px-2 py-0.5 rounded-full text-white">{p.userName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Plus de 4 participants : Intervenant principal + bande de vignettes miniatures en bas */
                <div className="w-full h-full flex flex-col gap-3">
                  <div className="flex-1 w-full relative rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                    <img src={currentUser.avatar || '/Avatar_Herisson.jpg'} alt="Intervenant" className="w-28 h-28 rounded-full ring-4 ring-emerald-400 shadow-2xl" />
                    <span className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-white">Intervenant principal</span>
                  </div>
                  <div className="h-24 flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                    {otherParticipants.map((p) => (
                      <div key={p.userId} className="w-20 h-20 shrink-0 relative rounded-xl bg-zinc-850 border border-zinc-750 flex flex-col items-center justify-center">
                        <img src={p.userAvatar || '/Avatar_Herisson.jpg'} alt={p.userName} className="w-10 h-10 rounded-full object-cover" />
                        <span className="text-[10px] text-zinc-300 truncate max-w-[60px] mt-1">{p.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barre Inférieure de Contrôles */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 py-3.5 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-md">
          {/* Couper / Activer Micro */}
          <button
            type="button"
            id="call-btn-toggle-mic"
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 p-3 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-750 border border-zinc-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Coupé' : 'Micro'}</span>
          </button>

          {/* Activer / Désactiver Caméra */}
          <button
            type="button"
            id="call-btn-toggle-video"
            onClick={toggleVideo}
            className={`flex flex-col items-center gap-1 p-3 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isVideoOff
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 border border-zinc-700'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="hidden sm:inline">{isVideoOff ? 'Sans vidéo' : 'Caméra'}</span>
          </button>

          {/* Inverser caméra si vidéo active */}
          {!isVideoOff && (
            <button
              type="button"
              id="call-btn-switch-camera"
              onClick={switchCamera}
              className="flex flex-col items-center gap-1 p-3 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs bg-zinc-800 text-zinc-200 hover:bg-zinc-750 border border-zinc-700 transition-all active:scale-95 cursor-pointer"
              title="Inverser caméra avant / arrière"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden sm:inline">Inverser</span>
            </button>
          )}

          {/* Bascule Haut-parleur */}
          <button
            type="button"
            id="call-btn-toggle-speaker"
            onClick={toggleSpeaker}
            className={`flex flex-col items-center gap-1 p-3 sm:px-4 sm:py-2.5 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isSpeakerOn
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-750 border border-zinc-700'
                : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800'
            }`}
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5 text-amber-300" /> : <VolumeX className="w-5 h-5" />}
            <span className="hidden sm:inline">{isSpeakerOn ? 'Haut-parleur' : 'Écouteur'}</span>
          </button>

          {/* Raccrocher */}
          <button
            type="button"
            id="call-btn-hangup"
            onClick={() => handleHangUp()}
            className="flex flex-col items-center gap-1 px-5 sm:px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Raccrocher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
