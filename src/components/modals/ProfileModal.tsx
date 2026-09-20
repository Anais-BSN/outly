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

  const [firstName, setFirstName] = useState(currentUser?.firstName || 'Thomas');
  const [lastName, setLastName] = useState(currentUser?.lastName || 'Dubois');
  const [email, setEmail] = useState(currentUser?.email || 'thomas.dubois@outlys.fr');
  const [avatar, setAvatar] = useState(
    currentUser?.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
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
  const [isEditingFirstName, setIsEditingFirstName] = useState(false);
  const [isEditingLastName, setIsEditingLastName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirstName(currentUser?.firstName || 'Thomas');
      setLastName(currentUser?.lastName || 'Dubois');
      setEmail(currentUser?.email || 'thomas.dubois@outlys.fr');
      setAvatar(
        currentUser?.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      );
      setShares(currentUser?.shares || 1);
      const savedTheme = localStorage.getItem('outly_theme') as 'light' | 'dark' | null;
      const effectiveTheme = savedTheme || currentUser?.themePreference || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      setThemePreference(effectiveTheme);
      setIsEditingFirstName(false);
      setIsEditingLastName(false);
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
    onSaveProfile({
      ...currentUser,
      firstName: firstName.trim() || currentUser.firstName,
      lastName: lastName.trim() || currentUser.lastName,
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
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('outly_theme', newTheme);
    onSaveProfile({
      ...currentUser,
      firstName: firstName.trim() || currentUser.firstName,
      lastName: lastName.trim() || currentUser.lastName,
      email: email.trim() || currentUser.email,
      avatar,
      shares,
      themePreference: newTheme,
    });
  };

  // Coordinate Inline Save Handlers
  const handleSaveFirstName = () => {
    const finalVal = firstName.trim() || currentUser.firstName || 'Prénom';
    setFirstName(finalVal);
    setIsEditingFirstName(false);
    onSaveProfile({
      ...currentUser,
      firstName: finalVal,
      lastName: lastName.trim() || currentUser.lastName,
      email: email.trim() || currentUser.email,
      avatar,
      shares,
      themePreference,
    });
  };

  const handleSaveLastName = () => {
    const finalVal = lastName.trim() || currentUser.lastName || 'Nom';
    setLastName(finalVal);
    setIsEditingLastName(false);
    onSaveProfile({
      ...currentUser,
      firstName: firstName.trim() || currentUser.firstName,
      lastName: finalVal,
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
    onSaveProfile({
      ...currentUser,
      firstName: firstName.trim() || currentUser.firstName,
      lastName: lastName.trim() || currentUser.lastName,
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
      onSaveProfile({
        ...currentUser,
        firstName: firstName.trim() || currentUser.firstName,
        lastName: lastName.trim() || currentUser.lastName,
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
      onSaveProfile({
        ...currentUser,
        firstName: firstName.trim() || currentUser.firstName,
        lastName: lastName.trim() || currentUser.lastName,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...currentUser,
      firstName: firstName.trim() || currentUser.firstName || 'Prénom',
      lastName: lastName.trim() || currentUser.lastName || 'Nom',
      email: email.trim() || currentUser.email,
      avatar,
      shares,
      themePreference,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        id="profile-modal-backdrop"
        onClick={onClose}
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
            onClick={onClose}
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
                      {item.name.split(' ')[0]}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Prénom */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Prénom
                </label>
                {isEditingFirstName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      id="profile-input-firstname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveFirstName();
                        } else if (e.key === 'Escape') {
                          setIsEditingFirstName(false);
                        }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3] dark:border-zinc-600 text-[#27272A] dark:text-[#FFF9EB] focus:outline-none focus:ring-2 focus:ring-[#5D0D18]"
                    />
                    <button
                      type="button"
                      id="profile-save-firstname-btn"
                      onClick={handleSaveFirstName}
                      className="px-2.5 py-1.5 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-colors cursor-pointer shrink-0"
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60">
                    <span className="text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] truncate">
                      {firstName || currentUser.firstName || 'Non renseigné'}
                    </span>
                    <button
                      type="button"
                      id="profile-edit-firstname-btn"
                      onClick={() => setIsEditingFirstName(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nom */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  Nom
                </label>
                {isEditingLastName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      id="profile-input-lastname"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveLastName();
                        } else if (e.key === 'Escape') {
                          setIsEditingLastName(false);
                        }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3] dark:border-zinc-600 text-[#27272A] dark:text-[#FFF9EB] focus:outline-none focus:ring-2 focus:ring-[#5D0D18]"
                    />
                    <button
                      type="button"
                      id="profile-save-lastname-btn"
                      onClick={handleSaveLastName}
                      className="px-2.5 py-1.5 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-colors cursor-pointer shrink-0"
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60">
                    <span className="text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] truncate">
                      {lastName || currentUser.lastName || 'Non renseigné'}
                    </span>
                    <button
                      type="button"
                      id="profile-edit-lastname-btn"
                      onClick={() => setIsEditingLastName(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* E-mail & Pseudo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* E-mail */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  <Mail className="w-3.5 h-3.5 text-[#5D0D18] dark:text-white" />
                  <span>Adresse e-mail</span>
                </div>
                {isEditingEmail ? (
                  <div className="flex items-center gap-1.5">
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
                          setIsEditingEmail(false);
                        }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#FFF9EB] dark:bg-zinc-900 border border-[#C7B7A3] dark:border-zinc-600 text-[#27272A] dark:text-[#FFF9EB] focus:outline-none focus:ring-2 focus:ring-[#5D0D18]"
                    />
                    <button
                      type="button"
                      id="profile-save-email-btn"
                      onClick={handleSaveEmail}
                      className="px-2.5 py-1.5 rounded-xl bg-[#5D0D18] text-[#FFF9EB] text-xs font-bold hover:bg-[#450912] transition-colors cursor-pointer shrink-0"
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border border-[#C7B7A3]/40 dark:border-zinc-700/60">
                    <span className="text-xs font-semibold text-[#27272A] dark:text-[#FFF9EB] truncate">
                      {email || currentUser.email}
                    </span>
                    <button
                      type="button"
                      id="profile-edit-email-btn"
                      onClick={() => setIsEditingEmail(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#5D0D18] dark:text-amber-200 hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Pseudo (@handle) */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#27272A] dark:text-[#FFF9EB]">
                  <AtSign className="w-3.5 h-3.5 text-[#5D0D18] dark:text-white" />
                  <span>Pseudo Outlys</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFF9EB]/50 dark:bg-zinc-900/40 border border-[#C7B7A3]/30 dark:border-zinc-700/40">
                  <span className="text-xs font-bold text-[#5D0D18] dark:text-white truncate">
                    {currentUser.handle || (currentUser.email ? `@${currentUser.email.split('@')[0]}` : '@utilisateur')}
                  </span>
                  <span className="text-[10px] text-[#27272A]/50 dark:text-zinc-400 font-medium">
                    Lecture seule
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
                  Parts de frais pour la répartition (1 à 20)
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
                        : 'bg-[#FFF9EB]/70 dark:bg-zinc-900/60 border-[#C7B7A3]/40 dark:border-zinc-800 hover:bg-[#FFF9EB]'
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
                            {u.firstName} {u.lastName}
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

            {/* Bouton pour connecter un autre compte (exige obligatoirement mot de passe) */}
            {onOpenAddAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddAccount();
                }}
                className="w-full py-2 rounded-xl border border-dashed border-[#5D0D18]/40 dark:border-amber-300/40 text-[#5D0D18] dark:text-amber-300 text-xs font-bold hover:bg-[#5D0D18]/5 dark:hover:bg-zinc-700/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Se connecter à un autre compte</span>
              </button>
            )}
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

          {/* Save Action & Logout */}
          <div className="pt-3 border-t border-[#C7B7A3]/40 dark:border-zinc-800 flex items-center justify-between gap-2">
            {onLogout ? (
              <button
                type="button"
                id="profile-logout-btn"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-3.5 py-2.5 rounded-full text-xs font-bold bg-zinc-200 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 hover:bg-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#E8D8C4] text-[#27272A] hover:bg-[#C7B7A3] cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                id="profile-save-submit-btn"
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#5D0D18] text-[#FFF9EB] hover:bg-[#450912] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Enregistrer mon profil
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
