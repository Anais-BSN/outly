import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Mail, AtSign, X, AlertCircle } from 'lucide-react';

export interface MultiEmailInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowHandles?: boolean;
  disabled?: boolean;
  maxItems?: number;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  id?: string;
  className?: string;
}

// Validation regex stricte pour les adresses email
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Regex pour les pseudos (@pseudo ou pseudo alphanumérique avec tirets/underscores)
const HANDLE_REGEX = /^@?[a-zA-Z0-9_-]{2,30}$/;

export const MultiEmailInput: React.FC<MultiEmailInputProps> = ({
  values,
  onChange,
  placeholder = 'ami@exemple.com, autre@exemple.com...',
  allowHandles = false,
  disabled = false,
  maxItems,
  error: externalError,
  onErrorChange,
  id = 'multi-email-input',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = externalError !== undefined ? externalError : internalError;

  const setError = (msg: string | null) => {
    if (onErrorChange) {
      onErrorChange(msg);
    } else {
      setInternalError(msg);
    }
  };

  const validateItem = (item: string): { valid: boolean; formatted: string; error?: string } => {
    const trimmed = item.trim();
    if (!trimmed) {
      return { valid: false, formatted: '' };
    }

    if (allowHandles && (trimmed.startsWith('@') || !trimmed.includes('@'))) {
      if (HANDLE_REGEX.test(trimmed)) {
        return { valid: true, formatted: trimmed.startsWith('@') ? trimmed : `@${trimmed}` };
      }
    }

    if (EMAIL_REGEX.test(trimmed)) {
      return { valid: true, formatted: trimmed.toLowerCase() };
    }

    return {
      valid: false,
      formatted: trimmed,
      error: `L'adresse "${trimmed}" n'est pas un e-mail valide`,
    };
  };

  const processAndAddItems = (rawText: string) => {
    if (!rawText.trim()) return;

    // Découpage selon virgule, point-virgule, espaces multiples, tabulations, retours à la ligne
    const tokens = rawText
      .split(/[,;\s\n\t]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (tokens.length === 0) return;

    const newValues = [...values];
    const invalidTokens: string[] = [];

    for (const token of tokens) {
      const { valid, formatted, error } = validateItem(token);
      if (valid) {
        if (!newValues.includes(formatted)) {
          if (maxItems && newValues.length >= maxItems) {
            setError(`Nombre maximum d'invités atteint (${maxItems})`);
            break;
          }
          newValues.push(formatted);
        }
      } else if (error) {
        invalidTokens.push(token);
      }
    }

    if (invalidTokens.length > 0) {
      setError(
        invalidTokens.length === 1
          ? `L'adresse "${invalidTokens[0]}" n'est pas au format e-mail valide.`
          : `Plusieurs adresses sont invalides : ${invalidTokens.join(', ')}`
      );
    } else {
      setError(null);
    }

    onChange(newValues);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        processAndAddItems(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      // Supprimer le dernier badge lors d'un appui sur Backspace
      e.preventDefault();
      const nextValues = values.slice(0, -1);
      onChange(nextValues);
      setError(null);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const pastedData = e.clipboardData.getData('text');
    if (pastedData && (pastedData.includes(',') || pastedData.includes(';') || pastedData.includes(' ') || pastedData.includes('\n'))) {
      e.preventDefault();
      processAndAddItems(pastedData);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      processAndAddItems(inputValue);
    }
  };

  const removeValue = (indexToRemove: number) => {
    if (disabled) return;
    const next = values.filter((_, idx) => idx !== indexToRemove);
    onChange(next);
    setError(null);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Zone de conteneur de saisie avec badges */}
      <div
        onClick={focusInput}
        className={`w-full min-h-[44px] p-2 rounded-2xl bg-[#FFF9EB] dark:bg-zinc-900 border text-xs transition-all flex flex-wrap items-center gap-1.5 cursor-text ${
          displayError
            ? 'border-red-400 dark:border-red-500/80 ring-2 ring-red-400/20'
            : 'border-[#C7B7A3]/60 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-[#6D2932] focus-within:border-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Liste des badges d'adresses déjà validées */}
        {values.map((val, index) => {
          const isHandle = val.startsWith('@');
          return (
            <span
              key={`${val}-${index}`}
              className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-[#E8D8C4] dark:bg-zinc-800 text-[#6D2932] dark:text-[#FFF9EB] font-medium border border-[#C7B7A3]/70 dark:border-zinc-700 text-xs shadow-xs animate-scale-in"
            >
              {isHandle ? (
                <AtSign className="w-3 h-3 text-[#6D2932] dark:text-amber-400 shrink-0" />
              ) : (
                <Mail className="w-3 h-3 text-[#6D2932] dark:text-amber-400 shrink-0" />
              )}
              <span className="truncate max-w-[200px]">{val}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  removeValue(index);
                }}
                className="p-0.5 rounded-full hover:bg-[#C7B7A3]/60 dark:hover:bg-zinc-700 text-[#6D2932] dark:text-zinc-300 transition-colors cursor-pointer"
                title={`Retirer ${val}`}
                aria-label={`Retirer ${val}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        {/* Input textuel dynamique */}
        <div className="flex-1 min-w-[140px] flex items-center gap-1.5 py-0.5 px-1">
          {values.length === 0 && (
            <Mail className="w-3.5 h-3.5 text-[#6D2932]/70 dark:text-zinc-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            id={id}
            type="text"
            disabled={disabled}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (displayError) setError(null);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            placeholder={values.length === 0 ? placeholder : 'Ajouter un autre e-mail...'}
            className="w-full bg-transparent border-none outline-hidden text-xs text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/40 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Message d'aide ou message d'erreur */}
      {displayError ? (
        <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-red-600 dark:text-red-400 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      ) : (
        <p className="px-1 text-[10px] text-[#27272A]/60 dark:text-zinc-400">
          Astuce : Séparez vos adresses par une virgule, un point-virgule, un espace ou la touche Entrée.
        </p>
      )}
    </div>
  );
};
