import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  AtSign,
  Upload,
  Plus,
  Minus,
  Moon,
  Sun,
  Sparkles,
  Check,
  Camera,
  KeyRound,
  LogOut,
  Users,
  Lock,
  UserPlus,
  ShieldCheck,
  Trash2,
  Eye,
  EyeOff,
  Pencil
} from 'lucide-react';
import { UserProfile } from '../../types';
import { CARTOON_AVATARS } from '../../constants/avatars';
import { api } from '../../services/api';
import { compressImage } from '../../utils/imageCompressor';
import { syncSystemBarsTheme } from '../../services/nativeService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  availableUsers?: UserProfile[];
  onSaveProfile: (updated: UserProfile) => void;
  onLogout?: () => void;
  onSwitchUser?: (user: UserProfile) => void;
  onOpenAddAccount?: () => void;
  onRemoveSavedAccount?: (userId: string) => void;
  onDeleteAccount?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableUsers = [],
  onSaveProfile,
  onLogout,
  onSwitchUser,
  onOpenAddAccount,
  onRemoveSavedAccount,
  onDeleteAccount,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(currentUser?.name || currentUser?.firstName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState(
    currentUser?.avatar || '/Avatar_Herisson.jpg'
  );
  const [shares, setShares] = useState(currentUser?.shares || 1);
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('outly_theme') as 'light' | 'dark' | null;
    return savedTheme || currentUser?.themePreference || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  });
  const [activeTab, setActiveTab] = useState<'cartoon' | 'upload'>('cartoon');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Field-specific inline editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const nameRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);

  // Annulation en cas de clic en dehors du champ édité ou du bouton d'enregistrement
  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isEditingName && nameRef.current && !nameRef.current.contains(target)) {
        setName(currentUser?.name || currentUser?.firstName || '');
        setIsEditingName(false);
      }
      if (isEditingEmail && emailRef.current && !emailRef.current.contains(target)) {
        setEmail(currentUser?.email || '');
        setIsEditingEmail(false);
      }
    };

    if (isEditingName || isEditingEmail) {
      document.addEventListener('mousedown', handlePointerDownOutside);
      document.addEventListener('touchstart', handlePointerDownOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isEditingName, isEditingEmail, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser?.name || currentUser?.firstName || '');
      setEmail(currentUser?.email || '');
      setAvatar(currentUser?.avatar || '/Avatar_Herisson.jpg');
      setShares(currentUser?.shares || 1);
      const savedTheme = localStorage.getItem('outly_theme') as 'light' | 'dark' | null;
      const effectiveTheme = savedTheme || currentUser?.themePreference || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      setThemePreference(effectiveTheme);
      setIsEditingName(false);
      setIsEditingEmail(false);
    }
  }, [isOpen, currentUser]);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save on Avatar Selection
  const handleSelectAvatar = (newAvatarUrl: string) => {
    setAvatar(newAvatarUrl);
    const finalName = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
    onSaveProfile({
      ...currentUser,
      name: finalName,
      firstName: finalName,
      lastName: '',
      email: email.trim() || currentUser.email,
      avatar: newAvatarUrl,
      shares,
      themePreference,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.85);
        handleSelectAvatar(compressed);
      } catch (err) {
        console.error('Erreur compression avatar:', err);
      }
    }
  };

  // Auto-save on Theme Toggle
  const handleThemeToggle = (newTheme: 'light' | 'dark') => {
    setThemePreference(newTheme);
    const isDark = newTheme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('outly_theme', newTheme);
    syncSystemBarsTheme(isDark);
    const finalName = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
    onSaveProfile({
      ...currentUser,
      name: finalName,
      firstName: finalName,
      lastName: '',
      email: email.trim() || currentUser.email,
      avatar,
      shares,
      themePreference: newTheme,
    });
  };

  // Coordinate Inline Save Handlers
  const handleSaveName = () => {
    const finalVal = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
    setName(finalVal);
    setIsEditingName(false);
    onSaveProfile({
      ...currentUser,
      name: finalVal,
      firstName: finalVal,
      lastName: '',
      email: email.trim() || currentUser.email,
      avatar,
      shares,
      themePreference,
    });
  };

  const handleSaveEmail = () => {
    const finalVal = email.trim() || currentUser.email;
    setEmail(finalVal);
    setIsEditingEmail(false);
    const finalName = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
    onSaveProfile({
      ...currentUser,
      name: finalName,
      firstName: finalName,
      lastName: '',
      email: finalVal,
      avatar,
      shares,
      themePreference,
    });
  };

  const incrementShares = () => {
    if (shares < 20) {
      const newShares = shares + 1;
      setShares(newShares);
      const finalName = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
      onSaveProfile({
        ...currentUser,
        name: finalName,
        firstName: finalName,
        lastName: '',
        email: email.trim() || currentUser.email,
        avatar,
        shares: newShares,
        themePreference,
      });
    }
  };

  const decrementShares = () => {
    if (shares > 1) {
      const newShares = shares - 1;
      setShares(newShares);
      const finalName = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
      onSaveProfile({
        ...currentUser,
        name: finalName,
        firstName: finalName,
        lastName: '',
        email: email.trim() || currentUser.email,
        avatar,
        shares: newShares,
        themePreference,
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Les deux mots de passe ne correspondent pas', error: true });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ text: 'Le mot de passe doit comporter au moins 4 caractères', error: true });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword(currentUser.id, currentPassword, newPassword);
      setPasswordMsg({ text: res.message || 'Mot de passe modifié avec succès !', error: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Erreur lors du changement de mot de passe', error: true });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleClose = () => {
    const finalName = name.trim() || currentUser.name || currentUser.firstName || 'Nom';
    onSaveProfile({
      ...currentUser,
      name: finalName,
      firstName: finalName,
      lastName: '',
      email: email.trim() || currentUser.email,
      avatar,
      shares,
      themePreference,
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="profile-modal-backdrop"
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
      />

      {/* Modal Card */}
      <div
        id="profile-modal-card"
        className="relative w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl shadow-2xl border border-[#C7B7A3]/60 dark:border-zinc-800 p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C7B7A3]/40 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#5D0D18] dark:text-white" />
            <h3 className="text-lg font-bold text-[#5D0D18] dark:text-white font-serif">
              Mon profil
            </h3>
          </div>
          <button
            id="profile-modal-close-btn"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-[#27272A] dark:text-zinc-400 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Avatar Selector Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
              Photo
            </label>

            <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#E8D8C4]/50 dark:bg-zinc-800/50 border border-[#C7B7A3]/40 dark:border-zinc-700">
              <img
                src={avatar}
                alt="Avatar aperçu"
                className="w-16 h-16 rounded-full object-cover ring-3 ring-[#5D0D18] shadow-sm"
                referrerPolicy="no-referrer"
              />

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cartoon')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'cartoon'
                        ? 'bg-[#5D0D18] text-[#FFF9EB]'
                        : 'bg-[#FFF9EB] dark:bg-zinc-700 text-[#27272A] dark:text-zinc-300'
                    }`}
                  >
                    Avatar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('upload');
                      fileInputRef.current?.click();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'upload'
                        ? 'bg-[#5D0D18] text-[#FFF9EB]'
                        : 'bg-[#FFF9EB] dark:bg-zinc-700 text-[#27272A] dark:text-zinc-300'
                    }`}
                  >
                    Photo locale
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                    id="profile-avatar-file-input"
                  />
                </div>
              </div>
            </div>

            {/* Cartoon animals gallery selector */}
            {activeTab === 'cartoon' && (
              <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-[#E8D8C4]/30 dark:bg-zinc-900 border border-[#C7B7A3]/30 dark:border-zinc-800">
                {CARTOON_AVATARS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAvatar(item.url)}
                    className={`relative p-1 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      avatar === item.url
                        ? 'bg-[#FFF9EB] dark:bg-zinc-800 border-[#5D0D18] ring-2 ring-[#5D0D18]'
                        : 'border-transparent hover:bg-[#FFF9EB]/60'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="text-[10px] font-medium text-[#27272A] dark:text-zinc-300 truncate w-full text-center">
                      {item.name}
                    </span>
                    {avatar === item.url && (
                      <div className="absolute -top-1 -right-1 bg-[#5D0D18] text-white rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations Personnelles & Coordonnées (Affichage par défaut en lecture seule et édition unitaire) */}
          <div className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-[#C7B7A3]/30 dark:border-zinc-700/50">
              <User className="w-4 h-4 text-[#5D0D18] dark:text-white" />
              <span className="text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] uppercase tracking-wider">
                Mes coordonnées
              </span>
            </div>

            {/* Nom */}
            <div className="w-full min-w-0 overflow-hidden" ref={nameRef}>
              <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                Nom (ou nom d'affichage)
              </label>
              {isEditingName ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/90 dark:bg-zinc-900/90 border border-[#5D0D18]/60 dark:border-zinc-600 w-full min-w-0 h-[42px] box-border">
                  <input
                    type="text"
                    id="profile-input-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveName();
                      } else if (e.key === 'Escape') {
                        setName(currentUser?.name || currentUser?.firstName || '');
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    className="w-full min-w-0 flex-1 px-1 py-0.5 text-xs bg-transparent text-[#27272A] dark:text-[#FFF9EB] focus:outline-none h-[26px]"
                  />
                  <button
                    type="button"
                    id="profile-save-name-btn"
                    onClick={handleSaveName}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#5D0D18] text-[#FFF9EB] text-[11px] font-bold hover:bg-[#450912] transition-colors cursor-pointer shrink-0 h-[26px] whitespace-nowrap shadow-2xs"
                  >
                    <span>Enregistrer</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 w-full min-w-0 h-[42px] box-border">
                  <span className="text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] truncate min-w-0 px-1">
                    {name || currentUser.name || currentUser.firstName || 'Non renseigné'}
                  </span>
                  <button
                    type="button"
                    id="profile-edit-name-btn"
                    onClick={() => setIsEditingName(true)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 h-[26px]"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>
                </div>
              )}
            </div>

            {/* E-mail & Pseudo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 w-full min-w-0">
              {/* E-mail */}
              <div className="space-y-1 w-full min-w-0 overflow-hidden" ref={emailRef}>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  <Mail className="w-3.5 h-3.5 text-[#5D0D18] dark:text-white" />
                  <span>Adresse e-mail</span>
                </div>
                {isEditingEmail ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/90 dark:bg-zinc-900/90 border border-[#5D0D18]/60 dark:border-zinc-600 w-full min-w-0 h-[42px] box-border">
                    <input
                      type="email"
                      id="profile-input-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEmail();
                        } else if (e.key === 'Escape') {
                          setEmail(currentUser?.email || '');
                          setIsEditingEmail(false);
                        }
                      }}
                      autoFocus
                      className="w-full min-w-0 flex-1 px-1 py-0.5 text-xs bg-transparent text-[#27272A] dark:text-[#FFF9EB] focus:outline-none h-[26px]"
                    />
                    <button
                      type="button"
                      id="profile-save-email-btn"
                      onClick={handleSaveEmail}
                      className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#5D0D18] text-[#FFF9EB] text-[11px] font-bold hover:bg-[#450912] transition-colors cursor-pointer shrink-0 h-[26px] whitespace-nowrap shadow-2xs"
                    >
                      <span>Enregistrer</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60 w-full min-w-0 h-[42px] box-border">
                    <span className="text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] truncate min-w-0 px-1">
                      {email || currentUser.email}
                    </span>
                    <button
                      type="button"
                      id="profile-edit-email-btn"
                      onClick={() => setIsEditingEmail(true)}
                      className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 h-[26px]"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Pseudo (@handle) */}
              <div className="space-y-1 w-full min-w-0 overflow-hidden">
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  <AtSign className="w-3.5 h-3.5 text-[#5D0D18] dark:text-white" />
                  <span>Pseudo</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/50 dark:bg-zinc-900/40 border border-[#C7B7A3]/30 dark:border-zinc-700/40 w-full min-w-0 h-[42px] box-border">
                  <span className="text-xs font-bold text-[#5D0D18] dark:text-white truncate min-w-0 px-1">
                    {currentUser.handle || (currentUser.email ? `@${currentUser.email.split('@')[0]}` : '@utilisateur')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shares Adjustment (Ajustement des parts de 1 à 20 via des boutons + et -) */}
          <div className="p-4 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Nombre de part
                </label>
                <p className="text-[11px] text-[#27272A]/70 dark:text-zinc-400">
                  Ex: 1 part = solo, 2 parts = couple, etc.
                </p>
              </div>

              {/* Stepper with - and + buttons */}
              <div className="flex items-center gap-2 bg-[#FFF9EB] dark:bg-zinc-900 px-3 py-1.5 rounded-2xl border border-[#C7B7A3]/60 dark:border-zinc-700 shadow-xs">
                <button
                  type="button"
                  id="profile-shares-minus-btn"
                  onClick={decrementShares}
                  disabled={shares <= 1}
                  className="p-1 rounded-lg text-[#5D0D18] dark:text-[#FFF9EB] hover:bg-[#E8D8C4] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4 stroke-[2.5]" />
                </button>

                <span
                  id="profile-shares-value-display"
                  className="text-base font-extrabold text-[#5D0D18] dark:text-amber-300 min-w-6 text-center"
                >
                  {shares}
                </span>

                <button
                  type="button"
                  id="profile-shares-plus-btn"
                  onClick={incrementShares}
                  disabled={shares >= 20}
                  className="p-1 rounded-lg text-[#5D0D18] dark:text-[#FFF9EB] hover:bg-[#E8D8C4] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Theme Selector (Strict Dark/Light Mode avec auto-save et contraste survol parfait) */}
          <div className="p-3.5 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/60 border border-[#C7B7A3]/60 dark:border-zinc-700 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] block">
                Thème
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#FFF9EB] dark:bg-zinc-900 p-1 rounded-xl border border-[#C7B7A3]/50 dark:border-zinc-700">
              <button
                type="button"
                id="profile-theme-light-btn"
                onClick={() => handleThemeToggle('light')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  themePreference === 'light'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-200 hover:bg-[#E8D8C4]/70 hover:text-[#5D0D18] dark:hover:bg-zinc-700 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Clair</span>
              </button>

              <button
                type="button"
                id="profile-theme-dark-btn"
                onClick={() => handleThemeToggle('dark')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  themePreference === 'dark'
                    ? 'bg-[#5D0D18] text-[#FFF9EB] shadow-xs'
                    : 'text-[#27272A] dark:text-zinc-200 hover:bg-[#E8D8C4]/70 hover:text-[#5D0D18] dark:hover:bg-zinc-700 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Sombre</span>
              </button>
            </div>
          </div>

          {/* Password Change Section (Accordéon) */}
          <div className="rounded-2xl border border-[#C7B7A3]/60 dark:border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="w-full p-3.5 bg-[#E8D8C4]/60 dark:bg-zinc-800/60 flex items-center justify-between text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>Changer mon mot de passe</span>
              </div>
              <span className="text-[11px] opacity-70">
                {showPasswordSection ? 'Masquer' : 'Modifier'}
              </span>
            </button>

            {showPasswordSection && (
              <div className="p-4 bg-[#FFF9EB] dark:bg-[#18181B] space-y-3 border-t border-[#C7B7A3]/40">
                <div>
                  <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                    Ancien mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 pr-10 py-2 rounded-xl bg-[#E8D8C4]/40 dark:bg-zinc-800 border border-[#C7B7A3]/50 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#27272A]/60 dark:text-zinc-400 hover:text-[#5D0D18] dark:hover:text-[#FFF9EB] transition-colors cursor-pointer p-0.5"
                      title={showCurrentPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-label={showCurrentPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 pr-10 py-2 rounded-xl bg-[#E8D8C4]/40 dark:bg-zinc-800 border border-[#C7B7A3]/50 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#27272A]/60 dark:text-zinc-400 hover:text-[#5D0D18] dark:hover:text-[#FFF9EB] transition-colors cursor-pointer p-0.5"
                        title={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        aria-label={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB] mb-1">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 pr-10 py-2 rounded-xl bg-[#E8D8C4]/40 dark:bg-zinc-800 border border-[#C7B7A3]/50 text-xs text-[#27272A] dark:text-[#FFF9EB]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#27272A]/60 dark:text-zinc-400 hover:text-[#5D0D18] dark:hover:text-[#FFF9EB] transition-colors cursor-pointer p-0.5"
                        title={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordMsg && (
                  <p
                    className={`text-xs font-semibold ${
                      passwordMsg.error ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {passwordMsg.text}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword}
                  className="px-4 py-2 rounded-full bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-all cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? 'Mise à jour...' : 'Confirmer le nouveau mot de passe'}
                </button>
              </div>
            )}
          </div>

          {/* Comptes enregistrés sur cet appareil (Isolement local des sessions) */}
          <div className="p-4 rounded-2xl bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border border-[#C7B7A3]/50 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5D0D18] dark:text-amber-300" />
                <label className="text-xs font-bold text-[#5D0D18] dark:text-[#FFF9EB]">
                  Comptes mémorisés sur cet appareil
                </label>
              </div>
              <span className="text-[10px] text-[#27272A]/70 dark:text-zinc-400 font-medium">
                {availableUsers.length} compte{availableUsers.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {availableUsers.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[#FFF9EB] dark:bg-zinc-800 border-[#5D0D18] dark:border-amber-300/40 shadow-xs'
                        : 'bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border-[#C7B7A3]/40 dark:border-zinc-800 hover:bg-[#FFF9EB] dark:hover:bg-zinc-800 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatar}
                        alt={u.firstName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#C7B7A3] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#27272A] dark:text-[#FFF9EB] truncate">
                            {u.name || u.firstName || 'Utilisateur'}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-[#5D0D18] text-[#FFF9EB] text-[9px] font-bold rounded-full shrink-0">
                              Actif
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#27272A]/60 dark:text-zinc-400 block truncate">
                          {u.handle || u.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isCurrent && onSwitchUser && (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchUser(u);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#5D0D18] text-[#FFF9EB] text-[11px] font-bold hover:bg-[#450912] transition-colors cursor-pointer"
                        >
                          Basculer
                        </button>
                      )}
                      {!isCurrent && onRemoveSavedAccount && (
                        <button
                          type="button"
                          onClick={() => onRemoveSavedAccount(u.id)}
                          title="Oublier ce compte de cet appareil"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions : Connexion à un autre compte et Déconnexion */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {onOpenAddAccount && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenAddAccount();
                  }}
                  className="flex-1 py-2 rounded-xl border border-dashed border-[#5D0D18]/40 dark:border-amber-300/40 text-[#5D0D18] dark:text-amber-300 text-xs font-bold hover:bg-[#5D0D18]/5 dark:hover:bg-zinc-700/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Se connecter à un autre compte</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  id="profile-logout-btn"
                  onClick={() => {
                    onLogout();
                    handleClose();
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-[#27272A] dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Se déconnecter</span>
                </button>
              )}
            </div>
          </div>

          {/* Zone de Danger : Suppression de Compte */}
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-red-700 dark:text-red-400 block">
                  Suppression du compte
                </span>
                <span className="text-[11px] text-red-600/80 dark:text-red-300/70">
                  Supprime définitivement votre profil, vos sorties et toutes vos données.
                </span>
              </div>

              <button
                type="button"
                id="profile-delete-account-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all cursor-pointer shadow-xs"
              >
                Supprimer mon compte
              </button>
            </div>

            {/* Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-red-300 dark:border-red-800 space-y-2.5 mt-2 animate-scale-in">
                <p className="text-xs text-[#27272A] dark:text-zinc-200 font-medium">
                  Êtes-vous sûr de vouloir supprimer définitivement votre compte Outlys ? Cette action est irréversible.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 rounded-lg bg-[#E8D8C4] text-[#27272A] text-xs font-bold hover:bg-[#C7B7A3] cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    id="confirm-delete-account-btn"
                    disabled={isDeleting}
                    onClick={async () => {
                      if (onDeleteAccount) {
                        setIsDeleting(true);
                        try {
                          await onDeleteAccount();
                          onClose();
                        } finally {
                          setIsDeleting(false);
                        }
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Suppression...' : 'Oui, supprimer définitivement'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
