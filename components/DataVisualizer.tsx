import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea
} from 'recharts';
import type { TimestepData, TimeStats } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { Loader } from './Loader';

// --- FFT and DSP Utilities ---
type Complex = { re: number; im: number };
type WindowFunction = (i: number, N: number) => number;

const WINDOW_FUNCTIONS: Record<string, WindowFunction> = {
  rectangular: () => 1,
  hamming: (i, N) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1)),
  hann: (i, N) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1))),
};

// Recursive Cooley-Tukey FFT
const fft = (x: Complex[]): Complex[] => {
  const N = x.length;
  if (N <= 1) return x;

  const even = fft(x.filter((_, i) => i % 2 === 0));
  const odd = fft(x.filter((_, i) => i % 2 !== 0));

  const result: Complex[] = new Array(N);
  for (let k = 0; k < N / 2; k++) {
    const t = odd[k];
    const angle = -2 * Math.PI * k / N;
    const exp = { re: Math.cos(angle), im: Math.sin(angle) };
    const term = {
      re: exp.re * t.re - exp.im * t.im,
      im: exp.re * t.im + exp.im * t.re
    };
    result[k] = {
      re: even[k].re + term.re,
      im: even[k].im + term.im
    };
    result[k + N / 2] = {
      re: even[k].re - term.re,
      im: even[k].im - term.im
    };
  }
  return result;
};


interface DataVisualizerProps {
  visualizerData: TimestepData[];
  currentTimestep: number;
  onTimestepChange: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  timeStats: TimeStats | null;
}

const COLORS = ['#FFBF00', '#4ade80', '#60a5fa', '#c084fc', '#f87171', '#fb923c', '#a3e635', '#22d3ee', '#a78bfa', '#fb7185'];

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export const DataVisualizer: React.FC<DataVisualizerProps> = ({
    visualizerData,
    currentTimestep,
    onTimestepChange,
    isLoading,
    timeStats
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [view, setView] = useState<'spectrum' | 'fft'>('spectrum');
    const [fftSize, setFftSize] = useState<number>(512);
    const [windowing, setWindowing] = useState<string>('hamming');

    const totalTimesteps = visualizerData?.length || 0;

    useEffect(() => {
        // Fix: Replaced NodeJS.Timeout with ReturnType<typeof setInterval> for browser compatibility.
        let interval: ReturnType<typeof setInterval>;
        if (isPlaying && totalTimesteps > 1) {
            interval = setInterval(() => {
                onTimestepChange(prev => (prev + 1) % totalTimesteps);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, onTimestepChange, totalTimesteps]);

    useEffect(() => {
        setIsPlaying(false);
    }, [visualizerData]);

    const waterfallData = useMemo(() => {
        if (!visualizerData || visualizerData.length === 0) return [];
        const allFrequencies = new Set<number>();
        visualizerData.forEach(ts => ts.spectrum.forEach(dp => allFrequencies.add(dp.frequency)));

        const sortedFrequencies = Array.from(allFrequencies).sort((a, b) => a - b);
        
        const dataMap = new Map<number, any>();

        sortedFrequencies.forEach(freq => {
            dataMap.set(freq, { frequency: freq });
        });

        visualizerData.forEach((ts, tsIndex) => {
            ts.spectrum.forEach(dp => {
                const entry = dataMap.get(dp.frequency);
                if (entry) {
                    entry[`ts_${tsIndex}`] = dp.power;
                }
            });
        });

        return Array.from(dataMap.values());
    }, [visualizerData]);
    
    const fftData = useMemo(() => {
        if (view !== 'fft' || !visualizerData[currentTimestep]?.spectrum || visualizerData[currentTimestep].spectrum.length === 0) {
            return [];
        }

        const currentSpectrum = visualizerData[currentTimestep].spectrum.map(d => d.power);
        
        // Zero-pad to FFT size
        const padded = new Array(fftSize).fill(0);
        const copyLength = Math.min(currentSpectrum.length, fftSize);
        for(let i=0; i<copyLength; i++) {
            padded[i] = currentSpectrum[i];
        }

        // Apply window function
        const windowFunc = WINDOW_FUNCTIONS[windowing];
        const windowed = padded.map((val, i) => val * windowFunc(i, fftSize));

        // Convert to complex numbers
        const complexSignal: Complex[] = windowed.map(re => ({ re, im: 0 }));

        // Perform FFT
        const fftResult = fft(complexSignal);

        // Calculate magnitude
        return fftResult.slice(0, fftSize / 2).map((c, i) => ({
            quefrency: i,
            magnitude: Math.sqrt(c.re * c.re + c.im * c.im)
        }));
    }, [view, currentTimestep, visualizerData, fftSize, windowing]);


    const timestepTimeRange = useMemo(() => {
        if (!timeStats || totalTimesteps === 0) return null;
        const durationPerStep = timeStats.durationSeconds / totalTimesteps;
        const start = currentTimestep * durationPerStep;
        const end = (currentTimestep + 1) * durationPerStep;
        return `T+${formatTime(start)} - T+${formatTime(end)}`;
    }, [timeStats, currentTimestep, totalTimesteps]);

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-full text-text-secondary"><Loader size="lg" /></div>;
    }

    if (!visualizerData || totalTimesteps === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center">
                <ChartBarIcon className="w-12 h-12 mb-4" />
                <h2 className="text-xl font-display text-text-main">RF Spectrum Visualizer</h2>
                <p className="mt-2 max-w-md">Spectrum data will be displayed here after an analysis is run.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-lg font-display text-primary-amber">
                    RF Spectrum Analysis {totalTimesteps > 0 ? `(Timestep ${currentTimestep + 1}/${totalTimesteps})` : ''}
                </h2>
                 <div className="flex items-center space-x-2 bg-base-300 p-1 rounded-md">
                     <button onClick={() => setView('spectrum')} className={`px-2 py-1 text-xs rounded ${view === 'spectrum' ? 'bg-primary-amber text-base-100 font-bold' : 'text-text-secondary hover:bg-base-200'}`}>Spectrum</button>
                     <button onClick={() => setView('fft')} className={`px-2 py-1 text-xs rounded ${view === 'fft' ? 'bg-primary-amber text-base-100 font-bold' : 'text-text-secondary hover:bg-base-200'}`}>FFT</button>
                 </div>
            </div>
            
            {view === 'fft' && (
                <div className="flex items-center space-x-4 mb-4 text-xs animate-fade-in">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="fft-size" className="text-text-secondary">FFT Size:</label>
                        <select id="fft-size" value={fftSize} onChange={e => setFftSize(parseInt(e.target.value))} className="bg-base-300 rounded p-1 text-text-main">
                            {[128, 256, 512, 1024, 2048].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="fft-window" className="text-text-secondary">Window:</label>
                        <select id="fft-window" value={windowing} onChange={e => setWindowing(e.target.value)} className="bg-base-300 rounded p-1 text-text-main">
                            {Object.keys(WINDOW_FUNCTIONS).map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="flex-grow animate-fade-in">
                <ResponsiveContainer width="100%" height="100%">
                    {view === 'spectrum' ? (
                        <LineChart data={waterfallData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" />
                            <XAxis dataKey="frequency" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10, fill: '#9ca3af' }} unit=" MHz" />
                            <YAxis domain={[-110, -20]} tick={{ fontSize: 10, fill: '#9ca3af' }} unit=" dBm" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a2233', border: '1px solid #4b5563', fontSize: '12px' }}
                                labelStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            {visualizerData.map((_, index) => (
                                <Line
                                    key={`ts_${index}`}
                                    type="monotone"
                                    dataKey={`ts_${index}`}
                                    name={`T${index + 1}`}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={currentTimestep === index ? 3 : 1}
                                    strokeOpacity={currentTimestep === index ? 1 : 0.4}
                                    dot={false}
                                />
                            ))}
                            {visualizerData[currentTimestep]?.anomalies.map((anomaly, index) => (
                                <ReferenceArea
                                    key={index}
                                    x1={anomaly.frequencyStart}
                                    x2={anomaly.frequencyEnd}
                                    fill="rgba(239, 68, 68, 0.2)"
                                    stroke="rgba(239, 68, 68, 0.5)"
                                    strokeDasharray="3 3"
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <BarChart data={fftData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.2)" />
                           <XAxis dataKey="quefrency" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Quefrency (bins)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 12 }} />
                           <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }} />
                           <Tooltip
                                contentStyle={{ backgroundColor: '#1a2233', border: '1px solid #4b5563', fontSize: '12px' }}
                                labelStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                            />
                           <Bar dataKey="magnitude" fill="#FFBF00" />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            <div className="flex items-center space-x-4 mt-4 flex-shrink-0">
                <button onClick={() => setIsPlaying(!isPlaying)} disabled={totalTimesteps <= 1} className="p-2 text-text-secondary hover:text-primary-amber disabled:opacity-50">
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </button>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold w-28 tabular-nums">Timestep {currentTimestep + 1}/{totalTimesteps}</span>
                    {timestepTimeRange && <span className="text-xs text-text-secondary tabular-nums">{timestepTimeRange}</span>}
                </div>
                <input
                    type="range" min="0" max={totalTimesteps > 0 ? totalTimesteps - 1 : 0}
                    value={currentTimestep} onChange={e => onTimestepChange(parseInt(e.target.value, 10))}
                    disabled={totalTimesteps <= 1} className="w-full"
                />
            </div>
        </div>
    );
};
