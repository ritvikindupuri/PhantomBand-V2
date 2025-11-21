// Fix: Removed unused and incorrect import of 'Recharts' from 'recharts'.
export enum EnvironmentType {
  Urban = 'Urban',
  Suburban = 'Suburban',
  Rural = 'Rural',
  Maritime = 'Maritime',
  Airborne = 'Airborne',
}

export enum SignalPropagationModel {
  FreeSpace = 'Free Space Path Loss',
  Hata = 'Hata Model (Urban)',
  LogDistance = 'Log-distance Path Loss',
}

export enum AtmosphericCondition {
  Clear = 'Clear',
  Rainy = 'Rainy',
  Foggy = 'Foggy',
  Snow = 'Snow',
}

export enum InterferenceLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Severe = 'Severe',
}

export enum DeceptionTarget {
  SIMULATE_GPS_SPOOFING = 'Simulate GPS Spoofing Attack',
  SIMULATE_ROGUE_WIFI_AP = 'Simulate Rogue Wi-Fi AP',
  JAM_C2_DRONE_LINK = 'Jam C2 Drone Link',
  EMULATE_GHOST_BLE_BEACON = 'Emulate Ghost BLE Beacon',
  GENERATE_DECOY_IOT_TRAFFIC = 'Generate Decoy IoT Traffic',
  GENERATE_CUSTOM_SCENARIO = 'Generate Custom Scenario',
  ANALYZE_UPLOADED_DATA = 'Analyze Uploaded RF Data',
}

export interface EnvironmentParams {
  type: EnvironmentType;
  propagationModel: SignalPropagationModel;
  atmosphericCondition: AtmosphericCondition;
}

export interface SimulationParams {
  environment: EnvironmentParams;
  interference: InterferenceLevel;
  deceptionTarget: DeceptionTarget;
  timesteps: number;
  customPrompt?: string;
}

export interface SpectrumDataPoint {
  frequency: number; // in MHz
  power: number; // in dBm
  timestamp?: number; // Unix epoch in milliseconds
}

export interface Anomaly {
    description: string;
    frequencyStart: number;
    frequencyEnd: number;
    classification: string;
    countermeasure: string;
}

export interface TimestepData {
    spectrum: SpectrumDataPoint[];
    anomalies: Anomaly[];
}

export type VisualizerData = TimestepData[];

export interface TimeStats {
    start: number; // Unix epoch ms
    end: number; // Unix epoch ms
    durationSeconds: number;
}

export interface AnalysisResult {
  scenario: string;
  visualizerData: VisualizerData;
  timeStats?: TimeStats;
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: string;
  params: SimulationParams;
}

// New type for the detailed client-side file analysis report
export interface FileAnalysisReport {
    fileName: string;
    rowCount: number;
    columnCount: number;
    headers: string[];
    stats: {
        frequency: { min: number; max: number };
        power: { min: number; max: number; avg: number };
    };
    samples: {
        firstRows: SpectrumDataPoint[];
        lastRows: SpectrumDataPoint[];
        peakPowerRows: SpectrumDataPoint[];
    };
    timeStats?: TimeStats;
}

export type AnalysisMode = 'generate' | 'analyze';
