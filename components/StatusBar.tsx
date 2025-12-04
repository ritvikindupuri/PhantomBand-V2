import React from 'react';
import type { SimulationParams, TimeStats } from '../types';

interface StatusBarProps {
    params: SimulationParams | null;
    timeStats: TimeStats | null;
}

const StatusItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-center sm:text-left">
            <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-primary-amber truncate" title={value}>{value}</p>
        </div>
    );
};

export const StatusBar: React.FC<StatusBarProps> = ({ params, timeStats }) => {
    if (!params) {
        return null; // Don't render anything if there's no analysis to show
    }

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        let result = '';
        if (h > 0) result += `${h}h `;
        if (m > 0) result += `${m}m `;
        if (s > 0 || result === '') result += `${s}s`;
        
        return result.trim();
    };

    return (
        <div className="bg-base-200/50 p-4 rounded-md border border-secondary/20 tactical-panel">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatusItem label="Deception Target" value={params.deceptionTarget} />
                {timeStats ? (
                     <StatusItem label="Time Range" value={formatDuration(timeStats.durationSeconds)} />
                ) : (
                    <StatusItem label="Environment" value={params.environment.type} />
                )}
                <StatusItem label="Interference" value={params.interference} />
                <StatusItem label="Timesteps" value={params.timesteps.toString()} />
            </div>
        </div>
    );
};
