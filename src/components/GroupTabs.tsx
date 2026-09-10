import React, { useRef } from 'react';
import {
  Calendar,
  MessageSquare,
  BarChart2,
  Image as ImageIcon,
  ClipboardList,
  Receipt,
  LucideIcon,
} from 'lucide-react';
import { TabType } from '../types';

interface GroupTabsProps {
  activeTab: TabType;
  onTabChange?: (tab: TabType) => void;
  onSelectTab?: (tab: TabType) => void;
  badges?: {
    agenda?: number;
    discussion?: number;
    sondages?: number;
    galerie?: number;
    logistique?: number;
    partage_frais?: number;
  };
}

interface TabConfig {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'agenda', label: 'Agenda', shortLabel: 'Agenda', icon: Calendar },
  { id: 'discussion', label: 'Discussion', shortLabel: 'Discussion', icon: MessageSquare },
  { id: 'sondages', label: 'Sondages', shortLabel: 'Sondages', icon: BarChart2 },
  { id: 'galerie', label: 'Galerie', shortLabel: 'Galerie', icon: ImageIcon },
  { id: 'logistique', label: 'Logistique', shortLabel: 'Logistique', icon: ClipboardList },
  { id: 'partage_frais', label: 'Partage des frais', shortLabel: 'Frais', icon: Receipt },
];

export const GroupTabs: React.FC<GroupTabsProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  badges = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleSelect = onTabChange || onSelectTab || (() => {});

  return (
    <nav
      id="bottom-group-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-30 w-full bg-[#FFF9EB]/98 dark:bg-[#18181B]/98 backdrop-blur-md border-t border-[#C7B7A3] dark:border-zinc-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-colors"
    >
      <div
        ref={containerRef}
        className="max-w-4xl mx-auto h-16 grid grid-cols-6 items-stretch px-1 sm:px-3 gap-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeCount = badges[tab.id];
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex-1 w-full h-full py-1 px-0.5 sm:px-1 flex flex-col items-center justify-center transition-all select-none cursor-pointer rounded-xl ${
                isActive
                  ? 'bg-[#E8D8C4] dark:bg-zinc-800 text-[#5D0D18] dark:text-[#FFF9EB] font-bold shadow-xs'
                  : 'text-[#27272A]/70 dark:text-zinc-400 hover:text-[#5D0D18] dark:hover:text-zinc-200 hover:bg-[#E8D8C4]/40'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {typeof badgeCount === 'number' && badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold bg-[#5D0D18] text-[#FFF9EB] flex items-center justify-center shadow-xs">
                    {badgeCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] sm:text-xs leading-tight tracking-tight mt-1 truncate max-w-full text-center">
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </span>

              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#5D0D18] dark:bg-[#FFF9EB] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
