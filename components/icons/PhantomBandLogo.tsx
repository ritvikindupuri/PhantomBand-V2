import React from 'react';

interface LogoProps {
  className?: string;
}

export const PhantomBandLogo: React.FC<LogoProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Background band lines */}
    <path d="M15 25 L85 25" strokeWidth="3" opacity="0.3" />
    <path d="M15 75 L85 75" strokeWidth="3" opacity="0.3" />

    {/* The "Phantom" signal wave */}
    <path
      d="M20 50 C 35 30, 45 70, 60 50 C 75 30, 85 70, 100 50"
      strokeWidth="7"
      className="text-primary-amber"
      style={{
        mask: 'linear-gradient(90deg, transparent, white 25%, white 75%, transparent)',
        WebkitMask: 'linear-gradient(90deg, transparent, white 25%, white 75%, transparent)',
      }}
    />
  </svg>
);