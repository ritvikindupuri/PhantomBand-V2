import { SimulationParams, EnvironmentType, InterferenceLevel, DeceptionTarget, SignalPropagationModel, AtmosphericCondition } from './types.ts';

export const INITIAL_SIMULATION_PARAMS: SimulationParams = {
  environment: {
    type: EnvironmentType.Urban,
    propagationModel: SignalPropagationModel.Hata,
    atmosphericCondition: AtmosphericCondition.Clear,
  },
  interference: InterferenceLevel.Low,
  deceptionTarget: DeceptionTarget.SIMULATE_GPS_SPOOFING,
  timesteps: 5,
  customPrompt: '',
};

// The maximum size of a file segment to analyze in memory.
// Moved here to prevent circular dependencies.
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB