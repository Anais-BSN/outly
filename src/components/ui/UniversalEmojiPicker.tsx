import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, X, Smile, Sparkles } from 'lucide-react';
import { EMOJI_CATEGORIES, ALL_EMOJIS_DATA, QUICK_REACTIONS, EmojiItem } from '../../data/emojis';
import { triggerHaptic } from '../../services/nativeService';

interface UniversalEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  // Positionnement personnalisé ou coordonnées d'ancrage optionnelles
  anchorRect?: DOMRect | null;
  mode?: 'popover' | 'bottomSheet' | 'auto';
  title?: string;
}

export const UniversalEmojiPicker: React.FC<UniversalEmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  anchorRect,
  mode = 'auto',
  title = 'Choisir un émoji',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const emojiListContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus automatique du champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategory('smileys');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Fermeture au clic en dehors et touche Échap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  // Synchronisation dynamique (ScrollSpy) : mise à jour de la catégorie active au défilement
  const handleScroll = useCallback(() => {
    if (searchQuery || isProgrammaticScrollRef.current || !emojiListContainerRef.current) return;

    const container = emojiListContainerRef.current;
    const containerTop = container.scrollTop;
    const containerRect = container.getBoundingClientRect();

    let currentCatId = EMOJI_CATEGORIES[0].id;

    for (const cat of EMOJI_CATEGORIES) {
      const section = document.getElementById(`emoji-cat-${cat.id}`);
      if (section) {
        const sectionTop = section.offsetTop - container.offsetTop;
        if (containerTop >= sectionTop - 40) {
          currentCatId = cat.id;
        }
      }
    }

    setActiveCategory(currentCatId);
  }, [searchQuery]);

  // Défilement automatique de la barre d'onglets pour garder le bouton actif visible
  useEffect(() => {
    if (categoryScrollRef.current && activeCategory) {
      const btn = categoryScrollRef.current.querySelector<HTMLElement>(`[data-cat-id="${activeCategory}"]`);
      if (btn) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  // Clic sur une catégorie : défilement fluide vers la section
  const handleCategoryTabClick = (catId: string) => {
    setActiveCategory(catId);
    triggerHaptic('light');

    const container = emojiListContainerRef.current;
    const section = document.getElementById(`emoji-cat-${catId}`);

    if (container && section) {
      isProgrammaticScrollRef.current = true;
      const targetTop = section.offsetTop - container.offsetTop - 4;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  };

  // Filtrage intelligent des émojis
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;

    return ALL_EMOJIS_DATA.filter((item) => {
      if (item.name.toLowerCase().includes(query)) return true;
      if (item.emoji.includes(query)) return true;
      return item.keywords.some((kw) => kw.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  // Émojis groupés par catégorie standard
  const emojisByCategory = useMemo(() => {
    const grouped: Record<string, EmojiItem[]> = {};
    EMOJI_CATEGORIES.forEach((cat) => {
      grouped[cat.id] = ALL_EMOJIS_DATA.filter((e) => e.category === cat.id);
    });
    return grouped;
  }, []);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    triggerHaptic('light');
    onSelectEmoji(emoji);
    onClose();
  };

  const useBottomSheet = mode === 'bottomSheet' || (mode === 'auto' && isMobile);

  // Calcul du positionnement adaptatif pour le mode popover (évite les débordements de l'écran)
  const getPopoverStyle = (): React.CSSProperties => {
    if (useBottomSheet || !anchorRect) {
      return {};
    }

    const pickerWidth = 360;
    const pickerHeight = 440;
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calcul horizontal (centré ou aligné sans déborder à gauche ou à droite)
    let left = anchorRect.left + anchorRect.width / 2 - pickerWidth / 2;
    if (left + pickerWidth > viewportWidth - margin) {
      left = viewportWidth - pickerWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Calcul vertical (au-dessus ou en-dessous selon l'espace disponible)
    const spaceAbove = anchorRect.top;
    const spaceBelow = viewportHeight - anchorRect.bottom;

    let top: number;
    if (spaceAbove >= pickerHeight + margin || spaceAbove > spaceBelow) {
      // Positionner au-dessus
      top = Math.max(margin, anchorRect.top - pickerHeight - 8);
    } else {
      // Positionner en dessous
      top = Math.min(viewportHeight - pickerHeight - margin, anchorRect.bottom + 8);
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${pickerWidth}px`,
      maxHeight: `${pickerHeight}px`,
      zIndex: 9999,
    };
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${
        useBottomSheet
          ? 'bg-black/60 backdrop-blur-xs flex items-end justify-center'
          : 'bg-black/20 backdrop-blur-[1px] pointer-events-auto'
      } animate-fade-in`}
    >
      <div
        ref={containerRef}
        style={!useBottomSheet ? getPopoverStyle() : undefined}
        className={`${
          useBottomSheet
            ? 'w-full max-w-lg bg-[#FFF9EB] dark:bg-[#18181B] rounded-t-3xl border-t border-[#C7B7A3] dark:border-zinc-800 shadow-2xl max-h-[85vh] h-[500px] flex flex-col p-4 pb-6 animate-slide-up'
            : 'bg-[#FFF9EB] dark:bg-[#18181B] rounded-3xl border border-[#C7B7A3] dark:border-zinc-700 shadow-2xl flex flex-col p-3.5 overflow-hidden h-[440px]'
        } text-[#27272A] dark:text-[#FFF9EB]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar pour mobile / bottom sheet */}
        {useBottomSheet && (
          <div className="flex justify-center pb-2">
            <div className="w-12 h-1.5 rounded-full bg-[#C7B7A3]/60 dark:bg-zinc-700" />
          </div>
        )}

        {/* En-tête avec titre et bouton fermer */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#5D0D18] text-amber-200 flex items-center justify-center text-sm shadow-xs">
              <Smile className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-sm text-[#5D0D18] dark:text-[#FFF9EB]">
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de recherche d'émojis */}
        <div className="relative mb-2.5 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D0D18]/70 dark:text-amber-200/70 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un émoji (ex: rire, coeur, bière, feu, pouce)..."
            className="w-full pl-9 pr-8 py-2 rounded-2xl bg-[#E8D8C4]/60 dark:bg-zinc-800/90 border border-[#C7B7A3] dark:border-zinc-700 text-xs sm:text-sm text-[#27272A] dark:text-[#FFF9EB] placeholder:text-[#27272A]/50 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#5D0D18]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 text-zinc-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Catégories standards avec ScrollSpy dynamique */}
        {!searchQuery && (
          <div
            ref={categoryScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 mb-2 border-b border-[#C7B7A3]/40 dark:border-zinc-800 shrink-0"
          >
            {EMOJI_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  data-cat-id={cat.id}
                  type="button"
                  onClick={() => handleCategoryTabClick(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer font-medium ${
                    isActive
                      ? 'bg-[#5D0D18] text-amber-200 shadow-xs scale-105 ring-1 ring-[#5D0D18]'
                      : 'bg-[#E8D8C4]/50 dark:bg-zinc-800 text-[#27272A]/80 dark:text-zinc-300 hover:bg-[#E8D8C4]'
                  }`}
                  title={cat.name}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-[11px] font-bold">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Grille des émojis scrollable avec écouteur de défilement synchronisé */}
        <div
          ref={emojiListContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4"
        >
          {/* Résultats de recherche */}
          {searchQuery && filteredEmojis && (
            <div>
              <div className="text-[11px] font-bold text-[#5D0D18] dark:text-amber-200 mb-2 px-1 flex items-center justify-between">
                <span>{filteredEmojis.length} résultat{filteredEmojis.length > 1 ? 's' : ''} pour « {searchQuery} »</span>
              </div>
              {filteredEmojis.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 dark:text-zinc-400">
                  <Smile className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#5D0D18]" />
                  <p>Aucun émoji trouvé pour cette recherche.</p>
                  <p className="text-[10px] mt-1 opacity-75">Essayez un autre mot-clé ou parcourez les catégories ci-dessus.</p>
                </div>
              ) : (
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                  {filteredEmojis.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={() => handleEmojiClick(item.emoji)}
                      title={item.name}
                      className="w-10 h-10 flex items-center justify-center text-xl sm:text-2xl rounded-xl hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 hover:scale-125 active:scale-95 transition-all cursor-pointer select-none"
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Affichage par catégories */}
          {!searchQuery && (
            <>
              {/* Réactions rapides suggérées en haut */}
              <div className="mb-2 p-2 rounded-2xl bg-[#E8D8C4]/40 dark:bg-zinc-800/40 border border-[#C7B7A3]/30">
                <div className="text-[10.5px] font-bold text-[#5D0D18] dark:text-amber-200 mb-1.5 px-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Réactions rapides populaires</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-[#E8D8C4] dark:hover:bg-zinc-700 hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {EMOJI_CATEGORIES.map((cat) => {
                const list = emojisByCategory[cat.id] || [];
                if (list.length === 0) return null;

                return (
                  <div key={cat.id} id={`emoji-cat-${cat.id}`} className="scroll-mt-2">
                    <div className="sticky top-0 bg-[#FFF9EB]/95 dark:bg-[#18181B]/95 backdrop-blur-xs py-1 px-1 z-10 flex items-center justify-between border-b border-[#C7B7A3]/30 dark:border-zinc-800/60 mb-1.5">
                      <span className="text-xs font-bold text-[#5D0D18] dark:text-amber-200 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {list.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                      {list.map((item) => (
                        <button
                          key={item.emoji}
                          type="button"
                          onClick={() => handleEmojiClick(item.emoji)}
                          title={item.name}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-[#E8D8C4] dark:hover:bg-zinc-800 hover:scale-125 active:scale-95 transition-all cursor-pointer select-none"
                        >
                          {item.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
