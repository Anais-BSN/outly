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
  AlertCircle,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { UserProfile, CallParticipant, GroupCallSession, CallType } from '../../types';
import { api } from '../../services/api';
import { triggerHaptic, triggerHapticNotification } from '../../services/nativeService';

interface GroupCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callSession: GroupCallSession | null;
  currentUser: UserProfile;
  groupName: string;
}

export const GroupCallModal: React.FC<GroupCallModalProps> = ({
  isOpen,
  onClose,
  callSession,
  currentUser,
  groupName,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callSession?.type === 'audio');
  const [isMinimized, setIsMinimized] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync initial video mode with session type
  useEffect(() => {
    if (callSession?.type) {
      setIsVideoOff(callSession.type === 'audio');
    }
  }, [callSession?.type]);

  // Timer de durée de l'appel
  useEffect(() => {
    if (!isOpen || !callSession?.active) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callSession?.active]);

  // Initialisation des flux médias (Microphone & Caméra)
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

      // Analyseur audio pour l'indicateur de parole en direct
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
            setIsSpeaking(avg > 18 && !isMuted);
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
        setPermissionError('Veuillez autoriser l\'accès au microphone et à la caméra dans vos paramètres.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('Aucun microphone ou caméra détecté sur cet appareil.');
      } else {
        setPermissionError('Impossible d\'accéder aux périphériques audio/vidéo.');
      }
    }
  }, [callSession?.type, isVideoOff, facingMode, isMuted]);

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

  // Bascule du microphone (Mute / Unmute)
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

  // Bascule de la caméra (On / Off)
  const toggleVideo = async () => {
    triggerHaptic('light');
    const nextVideoState = !isVideoOff;
    setIsVideoOff(nextVideoState);
    if (nextVideoState) {
      // Éteindre le flux vidéo
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
      // Rallumer la caméra
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
        console.warn('Impossible de réactiver la vidéo:', err);
      }
    }
  };

  // Bascule caméra avant / arrière
  const switchCamera = async () => {
    triggerHaptic('light');
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
  };

  // Raccrocher / Quitter l'appel
  const handleHangUp = async () => {
    triggerHaptic('medium');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (callSession?.groupId && callSession?.callId) {
      await api.leaveCall(callSession.groupId, callSession.callId, currentUser.id).catch(() => {});
    }
    setCallDuration(0);
    onClose();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !callSession) return null;

  const participants = callSession.participants || [];
  const otherParticipants = participants.filter((p) => p.userId !== currentUser.id);

  // Vue réduite (Picture-in-Picture)
  if (isMinimized) {
    return (
      <div
        id="call-floating-pip"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-3 p-3 rounded-2xl bg-[#18181B] text-[#FFF9EB] border border-zinc-700 shadow-2xl animate-fade-in cursor-pointer select-none"
        onClick={() => setIsMinimized(false)}
      >
        <div className="relative">
          <img
            src={currentUser.avatar || '/Avatar_Renard.jpg'}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#5D0D18]"
          />
          {isSpeaking && (
            <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{groupName}</span>
          </div>
          <span className="text-[11px] text-zinc-400">{formatDuration(callDuration)}</span>
        </div>
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={handleHangUp}
            className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Vue Plein Écran de l'Appel
  return (
    <div
      id="group-call-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-fade-in select-none"
    >
      <div className="relative w-full max-w-4xl h-[92dvh] max-h-[820px] flex flex-col justify-between rounded-3xl bg-[#18181B] border border-zinc-800 text-[#FFF9EB] shadow-2xl overflow-hidden">
        {/* Barre Supérieure d'Information */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-zinc-900/60 border-b border-zinc-800/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#5D0D18]/20 text-red-400">
              {callSession.type === 'video' ? (
                <Video className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
                  {groupName}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  En direct
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>{callSession.type === 'video' ? 'Appel vidéo' : 'Appel audio'}</span>
                <span>•</span>
                <span className="font-mono font-medium text-emerald-400">{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              title="Réduire l'appel"
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message d'erreur de permission */}
        {permissionError && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Grille des participants & flux vidéo */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto custom-scrollbar flex items-center justify-center">
          <div
            className={`w-full h-full grid gap-3 sm:gap-4 items-center justify-center ${
              participants.length <= 1
                ? 'grid-cols-1 max-w-lg mx-auto'
                : participants.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {/* Ma vignette / Mon flux */}
            <div className="relative w-full h-full min-h-[220px] max-h-[360px] flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-inner group">
              {!isVideoOff && callSession.type === 'video' ? (
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
                      src={currentUser.avatar || '/Avatar_Renard.jpg'}
                      alt={currentUser.firstName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#5D0D18]/60 shadow-xl"
                    />
                    {isSpeaking && (
                      <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                    )}
                  </div>
                  <span className="mt-3 text-sm font-bold text-white">
                    {currentUser.firstName} (Vous)
                  </span>
                </div>
              )}

              {/* Badges de statut sur ma vignette */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-xs font-semibold text-white">
                <span>{currentUser.firstName} (Vous)</span>
                {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </div>

              {callSession.type === 'video' && !isVideoOff && (
                <button
                  type="button"
                  onClick={switchCamera}
                  title="Inverser la caméra"
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors cursor-pointer sm:hidden"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Vignettes des autres participants */}
            {otherParticipants.map((p) => (
              <div
                key={p.userId}
                className="relative w-full h-full min-h-[220px] max-h-[360px] flex flex-col items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-inner"
              >
                <div className="relative flex flex-col items-center justify-center">
                  <div className="relative">
                    <img
                      src={p.userAvatar || '/Avatar_Renard.jpg'}
                      alt={p.userName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-zinc-700/60 shadow-xl"
                    />
                  </div>
                  <span className="mt-3 text-sm font-bold text-white">{p.userName}</span>
                </div>

                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-xs font-semibold text-white">
                  <span>{p.userName}</span>
                  {p.muted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>
            ))}

            {/* Si l'utilisateur est seul dans l'appel : inviter les autres */}
            {participants.length <= 1 && (
              <div className="col-span-full text-center p-3 text-zinc-400 text-xs">
                <span>En attente des autres membres du groupe... Une notification leur a été transmise !</span>
              </div>
            )}
          </div>
        </div>

        {/* Barre Inférieure de Contrôles */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 py-4 bg-zinc-900/80 border-t border-zinc-800/80 backdrop-blur-md">
          {/* Couper / Activer le Micro */}
          <button
            type="button"
            id="call-btn-toggle-mic"
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 p-3 sm:px-5 sm:py-3 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Micro coupé' : 'Micro actif'}</span>
          </button>

          {/* Activer / Couper la Caméra */}
          <button
            type="button"
            id="call-btn-toggle-video"
            onClick={toggleVideo}
            className={`flex flex-col items-center gap-1 p-3 sm:px-5 sm:py-3 rounded-2xl font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
              isVideoOff
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="hidden sm:inline">{isVideoOff ? 'Caméra coupée' : 'Caméra active'}</span>
          </button>

          {/* Inverser la caméra si vidéo active */}
          {!isVideoOff && (
            <button
              type="button"
              id="call-btn-switch-camera"
              onClick={switchCamera}
              className="flex flex-col items-center gap-1 p-3 sm:px-5 sm:py-3 rounded-2xl font-semibold text-xs bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden sm:inline">Inverser</span>
            </button>
          )}

          {/* Raccrocher */}
          <button
            type="button"
            id="call-btn-hangup"
            onClick={handleHangUp}
            className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/40 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Raccrocher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
