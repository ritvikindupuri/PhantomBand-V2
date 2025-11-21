import React from 'react';

interface IconProps {
  className?: string;
}

export const RefreshIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h5M20 20v-5h-5m-1.5-6.5l8-8m-15 15l8-8"
    />
  </svg>
);
