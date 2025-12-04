import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { Loader } from './Loader';
import type { Anomaly } from '../types';

interface DeceptionScenarioProps {
    scenario: string;
    currentTimestep: number;
    totalTimesteps: number;
    isLoading: boolean;
    anomalies: Anomaly[];
}

const ThreatAssessment: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
    if (!anomalies || anomalies.length === 0) {
        return null; // No anomalies, render nothing.
    }

    return (
        <div className="mt-4">
            <h4 className="font-semibold text-sm text-red-400 uppercase tracking-wider mb-2">Threat Assessment & Advisory</h4>
            <div className="space-y-4 bg-red-900/20 p-4 rounded-md border border-red-500/30">
                {anomalies.map((anomaly, index) => (
                    <div key={index} className={`space-y-3 ${index > 0 ? "pt-4 border-t border-red-500/20" : ""}`}>
                        <div>
                            <span className="inline-block bg-red-500/20 text-red-300 text-sm font-bold font-display tracking-wider px-3 py-1 rounded-full">{anomaly.classification}</span>
                        </div>
                        <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs font-mono">
                            <span className="text-text-secondary">DESCRIPTION:</span>
                            <span className="text-text-main font-sans text-sm">{anomaly.description}</span>
                            <span className="text-text-secondary">FREQUENCY:</span>
                            <span className="text-text-main">{`${anomaly.frequencyStart.toFixed(2)} - ${anomaly.frequencyEnd.toFixed(2)} MHz`}</span>
                        </div>
                        <div className="text-xs bg-amber-900/20 border border-amber-500/30 p-3 rounded-md">
                             <p className="font-bold text-amber-400 tracking-wider mb-1">COUNTERMEASURE ADVISORY</p>
                             <p className="text-amber-300 font-sans text-sm">{anomaly.countermeasure}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const DeceptionScenario: React.FC<DeceptionScenarioProps> = ({
    scenario,
    currentTimestep,
    totalTimesteps,
    isLoading,
    anomalies,
}) => {
    const [copyStatus, setCopyStatus] = React.useState<'idle' | 'copied'>('idle');

    const scenarioSections = useMemo(() => {
        if (!scenario) return [];
        // Split by markdown headers for "Timestep X"
        const sections = scenario.split(/(?=## Timestep \d|^\*\*Timestep \d+\*\*)/).filter(s => s.trim() !== '');
        return sections.map((sectionContent) => {
            const titleMatch = sectionContent.match(/## Timestep \d|^\*\*Timestep \d+\*\*/);
            const title = titleMatch ? titleMatch[0].replace(/#|\*/g, '').trim() : `Scenario Details`;
            const content = titleMatch ? sectionContent.substring(titleMatch[0].length).trim() : sectionContent;
            return { title, content };
        });
    }, [scenario]);

    const currentSection = useMemo(() => {
        return scenarioSections[currentTimestep];
    }, [scenarioSections, currentTimestep]);

    const handleCopyToClipboard = () => {
        if (scenario) {
            navigator.clipboard.writeText(scenario)
              .then(() => {
                  setCopyStatus('copied');
                  setTimeout(() => setCopyStatus('idle'), 2000);
              })
              .catch(err => console.error('Failed to copy text: ', err));
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                <Loader size="lg" />
                <p className="mt-4 text-lg font-display">Generating Scenario & Detecting Anomalies...</p>
                <p className="text-sm">This may take a few moments.</p>
            </div>
        );
    }

    if (!scenario || scenarioSections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                <h2 className="text-xl font-display text-text-main">Deception Scenario Analysis</h2>
                <p className="mt-2 max-w-md">Configure simulation parameters and click 'Run Analysis' to generate a detailed electronic warfare scenario and its RF spectrum data.</p>
            </div>
        );
    }

    const getTitle = () => {
        const baseTitle = 'Scenario Narrative';
        if (totalTimesteps > 0) {
            return `${baseTitle} (Timestep ${currentTimestep + 1} / ${totalTimesteps})`;
        }
        return baseTitle;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-lg font-display text-primary-amber">{getTitle()}</h2>
                <button onClick={handleCopyToClipboard} className="flex items-center space-x-2 text-sm text-text-secondary hover:text-primary-amber transition-colors rounded-md p-1">
                    <ClipboardIcon className="w-5 h-5" />
                    <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy Scenario'}</span>
                </button>
            </div>

            <div className="bg-base-100/50 rounded-md p-4 animate-fade-in border border-secondary/20 flex-grow overflow-y-auto">
                {currentSection ? (
                    <>
                        <h3 className="font-bold text-md text-primary-amber mb-3">{currentSection.title}</h3>
                        <div className="prose prose-sm prose-invert max-w-none prose-headings:text-text-secondary prose-headings:font-semibold prose-strong:text-text-main">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSection.content}</ReactMarkdown>
                        </div>
                        <ThreatAssessment anomalies={anomalies} />
                    </>
                ) : (
                    <p className="text-text-secondary">Select a timestep to view details.</p>
                )}
            </div>
        </div>
    );
};