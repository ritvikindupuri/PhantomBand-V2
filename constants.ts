import { SimulationParams, EnvironmentType, InterferenceLevel, DeceptionTarget, SignalPropagationModel, AtmosphericCondition } from './types';

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