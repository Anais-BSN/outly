import React from 'react';
import { Bell, Clock, ShieldCheck, ExternalLink, X } from 'lucide-react';
import { triggerHaptic } from '../../services/nativeService';

interface ExactAlarmPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const ExactAlarmPermissionModal: React.FC<ExactAlarmPermissionModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  const handleOpenSettings = () => {
    triggerHaptic('medium');
    onOpenSettings();
  };

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <div
      id="exact-alarm-permission-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#18181B] border border-zinc-700/80 text-[#FFF9EB] p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-scale-in">
        {/* Bouton fermeture discret */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge Icone avec pulsation */}
        <div className="relative my-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6D2932] to-amber-600 flex items-center justify-center shadow-lg shadow-[#6D2932]/40 ring-4 ring-zinc-800">
            <Bell className="w-8 h-8 text-white animate-bounce" />
          </div>
        </div>

        {/* Titre et sous-titre */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Autorisation Système Android
          </span>
          <h3 className="text-xl font-bold text-white font-serif tracking-tight">
            Alarmes et rappels Outlys
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
            Pour faire sonner vos appels entrants et déclencher vos rappels d'événements à la seconde exacte, Android nécessite l'activation des <span className="font-semibold text-amber-300">alarmes et rappels</span>.
          </p>
        </div>

        {/* Liste des bénéfices */}
        <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5 text-left text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#6D2932]/30 text-amber-400 shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Sonnerie des appels en direct</p>
              <p className="text-[11px] text-zinc-400">Votre téléphone sonne immédiatement lorsqu'un ami lance un appel de groupe.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#6D2932]/30 text-amber-400 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Rappels d'agenda à l'heure pile</p>
              <p className="text-[11px] text-zinc-400">Ne manquez aucun départ, vote ou rendez-vous important de vos groupes.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#6D2932]/30 text-amber-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Fiabilité même en veille</p>
              <p className="text-[11px] text-zinc-400">Garantit la réception de vos alertes même si l'écran est éteint.</p>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="w-full flex flex-col gap-2 pt-1">
          <button
            onClick={handleOpenSettings}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#6D2932] hover:bg-[#541C24] text-[#FFF9EB] shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Activer dans les paramètres</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};
