// Fix: Added .ts extension to module path.
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