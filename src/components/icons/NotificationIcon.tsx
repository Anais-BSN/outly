import React from 'react';

interface NotificationIconProps {
  className?: string;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  className = 'w-[22px] h-[22px]',
}) => {
  return (
    <img
      src="/Logo_Noir.svg"
      alt="Logo"
      className={`inline-block select-none shrink-0 ${className}`}
    />
  );
};
