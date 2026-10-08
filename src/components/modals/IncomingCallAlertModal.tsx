import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { GroupCallSession, UserProfile } from '../../types';
import { soundService } from '../../services/soundService';
import { triggerHaptic, triggerHapticNotification } from '../../services/nativeService';

interface IncomingCallAlertModalProps {
  isOpen: boolean;
  callSession: GroupCallSession | null;
  currentUser: UserProfile;
  onAccept: () => void;
  onDecline: () => void;
  isMutedGroup?: boolean;
}

export const IncomingCallAlertModal: React.FC<IncomingCallAlertModalProps> = ({
  isOpen,
  callSession,
  currentUser,
  onAccept,
  onDecline,
  isMutedGroup = false,
}) => {
  useEffect(() => {
    let stopRingtone: (() => void) | null = null;
    if (isOpen && !isMutedGroup) {
      stopRingtone = soundService.startIncomingRingtone();
      triggerHapticNotification('success');
    }
    return () => {
      if (stopRingtone) stopRingtone();
      soundService.stopRingtone();
    };
  }, [isOpen, isMutedGroup]);

  if (!isOpen || !callSession) return null;

  const isVideo = callSession.type === 'video';

  return (
    <div
      id="incoming-call-alert-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#18181B] border border-zinc-700 text-[#FFF9EB] p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-scale-in">
        {/* Glow & Avatar Pulse */}
        <div className="relative my-2">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#5D0D18] to-amber-500 opacity-60 animate-ping" />
          <div className="relative">
            <img
              src={callSession.initiatorAvatar || '/Avatar_Herisson.jpg'}
              alt={callSession.initiatorName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#5D0D18] shadow-2xl"
            />
            <div className="absolute bottom-0 right-0 p-2 rounded-full bg-[#5D0D18] text-white ring-2 ring-[#18181B]">
              {isVideo ? <Video className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            {isVideo ? 'Appel vidéo de groupe' : 'Appel audio de groupe'}
          </span>
          <h3 className="text-xl font-bold text-white font-serif">
            {callSession.groupName || 'Groupe Outlys'}
          </h3>
          <p className="text-xs text-zinc-300">
            Lancé par <span className="font-semibold text-white">{callSession.initiatorName}</span>
          </p>
        </div>

        {/* Action Buttons: Decline & Accept */}
        <div className="flex items-center justify-center gap-8 pt-3 w-full">
          {/* Refuser */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              id="incoming-call-decline-btn"
              onClick={() => {
                triggerHaptic('medium');
                soundService.stopRingtone();
                onDecline();
              }}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/40 transition-transform active:scale-90 cursor-pointer"
              title="Refuser l'appel"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-zinc-400 font-medium">Refuser</span>
          </div>

          {/* Décrocher */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              id="incoming-call-accept-btn"
              onClick={() => {
                triggerHaptic('heavy');
                soundService.stopRingtone();
                onAccept();
              }}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 transition-transform active:scale-90 cursor-pointer animate-pulse"
              title="Décrocher"
            >
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-xs text-emerald-400 font-bold">Décrocher</span>
          </div>
        </div>
      </div>
    </div>
  );
};
