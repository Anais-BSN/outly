import React from 'react';
import logoNoirSvg from '../../assets/Logo_Noir.svg';

interface NotificationIconProps {
  className?: string;
  alt?: string;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  className = 'w-5 h-5',
  alt = 'Notifications',
}) => {
  return (
    <img
      src={logoNoirSvg}
      alt={alt}
      className={`inline-block object-contain select-none pointer-events-none dark:invert dark:brightness-125 transition-all ${className}`}
      aria-hidden="true"
    />
  );
};
