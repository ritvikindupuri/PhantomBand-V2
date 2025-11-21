import React from 'react';
import { PhantomBandLogo } from './icons/PhantomBandLogo.tsx';
import { RefreshIcon } from './icons/RefreshIcon.tsx';
import { DownloadIcon } from './icons/DownloadIcon.tsx';

interface HeaderProps {
    onRefresh: () => void;
    onDownload: () => void;
    isDownloadDisabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, onDownload, isDownloadDisabled }) => {
  return (
    <header className="py-4 border-b border-secondary/20">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center justify-center space-x-3">
            <PhantomBandLogo className="w-9 h-9 text-primary-amber" />
            <h1 className="text-2xl font-bold font-display text-text-main tracking-wider uppercase">
            PhantomBand
            </h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className="text-xs font-semibold text-green-400 tracking-wider">SYSTEM STATUS: OPERATIONAL</span>
            </div>
             <button
              onClick={onDownload}
              disabled={isDownloadDisabled}
              className="p-2 text-text-secondary hover:text-primary-amber transition-colors rounded-full hover:bg-base-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download report"
            >
              <DownloadIcon className="w-6 h-6" />
            </button>
            <button
              onClick={onRefresh}
              className="p-2 text-text-secondary hover:text-primary-amber transition-colors rounded-full hover:bg-base-200"
              aria-label="Start new session"
            >
              <RefreshIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
    </header>
  );
};