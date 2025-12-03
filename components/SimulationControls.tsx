import React from 'react';
import { FileUpload } from './FileUpload.tsx';
import type { SimulationParams, EnvironmentParams, FileAnalysisReport, AnalysisMode } from '../types.ts';
import { EnvironmentType, InterferenceLevel, DeceptionTarget, SignalPropagationModel, AtmosphericCondition } from '../types.ts';

interface SimulationControlsProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  onFileChange: (file: File | null) => void;
  onRunFileAnalysis: (file: File | Blob, options?: { manualFreqIndex?: number; manualPowerIndex?: number; manualTimeIndex?: number }) => void;
  uploadedFile: File | null;
  analysisReport: FileAnalysisReport | null;
  analysisError: Error | string | null;
}

const SelectControl: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[]; 
  disabled?: boolean;
}> = ({ label, value, onChange, options, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-base-300">{option}</option>
      ))}
    </select>
  </div>
);

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 text-center font-semibold text-sm py-2 px-1 transition-all duration-200 border-b-2 ${
            isActive ? 'text-primary-amber border-primary-amber' : 'text-text-secondary border-transparent hover:text-text-main'
        }`}
    >
        {label}
    </button>
);


export const SimulationControls: React.FC<SimulationControlsProps> = ({ 
    params, 
    onParamsChange, 
    mode, 
    onModeChange, 
    onFileChange, 
    onRunFileAnalysis,
    uploadedFile,
    analysisReport, 
    analysisError 
}) => {
  const handleChange = <T,>(field: keyof SimulationParams, value: T) => {
    onParamsChange({ ...params, [field]: value });
  };

  const handleEnvironmentChange = <T,>(field: keyof EnvironmentParams, value: T) => {
    onParamsChange({
      ...params,
      environment: {
        ...params.environment,
        [field]: value
      }
    });
  };

  const deceptionTargetOptions = Object.values(DeceptionTarget).filter(
      t => t !== DeceptionTarget.ANALYZE_UPLOADED_DATA
  );

  return (
    <div className="space-y-6">
      <div className="flex bg-base-300/50 rounded-md p-1">
        <TabButton label="GENERATE SCENARIO" isActive={mode === 'generate'} onClick={() => onModeChange('generate')} />
        <TabButton label="ANALYZE FILE" isActive={mode === 'analyze'} onClick={() => onModeChange('analyze')} />
      </div>

      {mode === 'generate' && (
          <div className="space-y-6 animate-fade-in">
              <fieldset className="control-fieldset">
                  <legend className="control-legend">Environment</legend>
                  <div className="space-y-4">
                      <SelectControl
                          label="Environment Type"
                          value={params.environment.type}
                          onChange={(e) => handleEnvironmentChange('type', e.target.value as EnvironmentType)}
                          options={Object.values(EnvironmentType)}
                      />
                      <SelectControl
                          label="Signal Propagation Model"
                          value={params.environment.propagationModel}
                          onChange={(e) => handleEnvironmentChange('propagationModel', e.target.value as SignalPropagationModel)}
                          options={Object.values(SignalPropagationModel)}
                      />
                      <SelectControl
                          label="Atmospheric Conditions"
                          value={params.environment.atmosphericCondition}
                          onChange={(e) => handleEnvironmentChange('atmosphericCondition', e.target.value as AtmosphericCondition)}
                          options={Object.values(AtmosphericCondition)}
                      />
                  </div>
              </fieldset>
              
              <fieldset className="control-fieldset">
                  <legend className="control-legend">Threat Profile</legend>
                  <div className="space-y-4">
                      <SelectControl
                          label="Interference Level"
                          value={params.interference}
                          onChange={(e) => handleChange('interference', e.target.value as InterferenceLevel)}
                          options={Object.values(InterferenceLevel)}
                      />
                      <SelectControl
                          label="Deception Target"
                          value={params.deceptionTarget}
                          onChange={(e) => handleChange('deceptionTarget', e.target.value as DeceptionTarget)}
                          options={deceptionTargetOptions}
                      />
                      {params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && (
                          <div className="animate-fade-in">
                              <label htmlFor="customPrompt" className="block text-sm font-medium text-text-secondary mb-1">
                                  Custom Scenario Description
                              </label>
                              <textarea
                                  id="customPrompt"
                                  rows={4}
                                  className="w-full bg-base-300 border border-secondary/50 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-amber text-text-main text-sm"
                                  placeholder="e.g., Simulate a drone swarm communicating with a central controller amidst heavy urban interference..."
                                  value={params.customPrompt}
                                  onChange={(e) => handleChange('customPrompt', e.target.value)}
                              />
                          </div>
                      )}
                  </div>
              </fieldset>

              <fieldset className="control-fieldset">
                  <legend className="control-legend">Temporal Dynamics</legend>
                  <div>
                      <label htmlFor="timesteps-gen" className="block text-sm font-medium text-text-secondary mb-2">
                          Timesteps
                      </label>
                      <div className="flex items-center space-x-4">
                          <input
                              id="timesteps-gen"
                              type="range"
                              min="1"
                              max="10"
                              value={params.timesteps}
                              onChange={(e) => handleChange('timesteps', parseInt(e.target.value, 10))}
                              className="w-full"
                          />
                          <span className="text-sm font-semibold text-primary-amber w-8 text-center bg-base-300 rounded-md py-1">{params.timesteps}</span>
                      </div>
                  </div>
              </fieldset>
          </div>
      )}

      {mode === 'analyze' && (
          <div className="space-y-6 animate-fade-in">
              <FileUpload 
                onFileChange={onFileChange} 
                onRunFileAnalysis={onRunFileAnalysis}
                uploadedFile={uploadedFile}
                analysisReport={analysisReport} 
                analysisError={analysisError} 
              />
               <fieldset className="control-fieldset">
                  <legend className="control-legend">Analysis Parameters</legend>
                  <div>
                      <label htmlFor="timesteps-analyze" className="block text-sm font-medium text-text-secondary mb-2">
                          Analysis Timesteps
                      </label>
                      <div className="flex items-center space-x-4">
                          <input
                              id="timesteps-analyze"
                              type="range"
                              min="1"
                              max="10"
                              value={params.timesteps}
                              onChange={(e) => handleChange('timesteps', parseInt(e.target.value, 10))}
                              className="w-full"
                          />
                          <span className="text-sm font-semibold text-primary-amber w-8 text-center bg-base-300 rounded-md py-1">{params.timesteps}</span>
                      </div>
                      <p className="text-xs text-text-secondary/70 mt-2">Defines the number of narrative steps the Engine should generate to explain the data.</p>
                  </div>
              </fieldset>
          </div>
      )}
    </div>
  );
};