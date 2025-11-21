import * as tf from '@tensorflow/tfjs';
import { DeceptionTarget, EnvironmentType, InterferenceLevel } from '../types.ts';
import type { SimulationParams, AnalysisResult, FileAnalysisReport, SpectrumDataPoint, Anomaly } from '../types.ts';

// --- TENSORFLOW MODEL ARCHITECTURE ---
// The "Model" here is not a pretrained neural network (like MobileNet).
// It is a "Procedural Physics Graph" constructed using Differentiable Programming.
// Training Data: None (It is calibrated on Maxwell's Equations & ITU-R Noise Models).
// Execution: WebGL/GPU accelerated via tfjs-backend-webgl.

// 1. PHYSICS CONSTANTS & CALIBRATION
// These constants define the "weights" of our procedural model.
const BASELINE_THERMAL_NOISE = -100; // dBm
const ENV_FACTORS = {
    [EnvironmentType.Urban]: { mean: 15, std: 5 }, // Higher noise floor, high variance
    [EnvironmentType.Suburban]: { mean: 8, std: 3 },
    [EnvironmentType.Rural]: { mean: 0, std: 1.5 },
    [EnvironmentType.Maritime]: { mean: 2, std: 1 }, // Reflections off water
    [EnvironmentType.Airborne]: { mean: -5, std: 1 }, // Line of sight, lower noise
};

const INTERFERENCE_FACTORS = {
    [InterferenceLevel.Low]: { gain: 0, variance_mult: 1 },
    [InterferenceLevel.Medium]: { gain: 5, variance_mult: 1.5 },
    [InterferenceLevel.High]: { gain: 12, variance_mult: 2.5 },
    [InterferenceLevel.Severe]: { gain: 20, variance_mult: 4.0 },
};

/**
 * GENERATIVE FUNCTION: Creates the background RF environment.
 * Operation: N(f) ~ Gaussian(Mu, Sigma)
 */
const generateBaselineNoise = (
    environment: EnvironmentType, 
    interference: InterferenceLevel, 
    numPoints: number
): tf.Tensor => {
    const envParams = ENV_FACTORS[environment];
    const intParams = INTERFERENCE_FACTORS[interference];

    // Calculate effective Mean and StdDev for the Gaussian distribution
    const effectiveMean = BASELINE_THERMAL_NOISE + envParams.mean + intParams.gain;
    const effectiveStd = envParams.std * intParams.variance_mult;

    // Generate Tensor on GPU
    return tf.randomNormal([numPoints], effectiveMean, effectiveStd);
};

/**
 * ATTACK VECTOR GENERATION
 * Mathematical modeling of specific RF threats using signal processing primitives.
 */
const generateAttackSignal = (
    target: DeceptionTarget,
    freqAxis: tf.Tensor,
    timesteps: number,
    currentStep: number
): { signal: tf.Tensor, description: string, classification: string, countermeasure: string, startFreq: number, endFreq: number } | null => {
    
    // 1. GPS SPOOFING MODEL
    // Physics: Narrowband, continuous wave (CW) or spread spectrum centered at 1575.42 MHz.
    if (target === DeceptionTarget.SIMULATE_GPS_SPOOFING) {
        const centerFreq = 1575.42;
        const bw = 2.0; // 2 MHz bandwidth
        
        // Math: Create a "Boxcar" filter mask around the center frequency
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw / 2);
        
        // Signal: Low power (-75dBm), slightly above noise, mimicking a fake satellite
        const signalPattern = tf.randomNormal(freqAxis.shape, -75, 1); 
        const power = tf.mul(mask, signalPattern);
        
        return {
            signal: power,
            description: "Narrowband signal matching GPS L1 C/A center frequency. Timing deviation detected.",
            classification: "GPS SPOOFING",
            countermeasure: "Verify coordinates with INS/IMU; Monitor for AGC jumps.",
            startFreq: 1574,
            endFreq: 1576
        };
    }

    // 2. ROGUE AP MODEL
    // Physics: Pulsed transmission (Beacons) on ISM band (2.4GHz).
    if (target === DeceptionTarget.SIMULATE_ROGUE_WIFI_AP) {
        const centerFreq = 2412; // Channel 1
        const bw = 20;
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw / 2);
        
        // Time-Domain Logic: Only active on even steps (pulsing beacon)
        const isPulse = currentStep % 2 === 0 ? 1 : 0.01; 
        const power = tf.mul(mask, tf.scalar(-40 * isPulse));
        
        return {
            signal: power,
            description: "High-power intermittent beacon frames on 2.4GHz Ch 1. SSID spoofing suspected.",
            classification: "ROGUE ACCESS POINT",
            countermeasure: "RSSI Triangulation; Whitelist MAC addresses.",
            startFreq: 2402,
            endFreq: 2422
        };
    }

    // 3. JAMMING MODEL
    // Physics: Wideband Gaussian Noise (High Entropy).
    if (target === DeceptionTarget.JAM_C2_DRONE_LINK) {
        const centerFreq = 915; 
        const bw = 10; 
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw / 2);
        
        // Signal: High power (-30dBm), high variance noise
        const jammerNoise = tf.randomNormal(freqAxis.shape, -30, 5);
        const power = tf.mul(mask, jammerNoise);
        
        return {
            signal: power,
            description: "Broadband high-energy Gaussian noise masking control channels.",
            classification: "UAV C2 JAMMING",
            countermeasure: "Frequency Hopping (FHSS); Return-to-Home (RTH).",
            startFreq: 910,
            endFreq: 920
        };
    }

    // 4. IOT TRAFFIC INJECTION
    // Physics: Multiple narrowband carriers (FDM) hopping.
    if (target === DeceptionTarget.GENERATE_DECOY_IOT_TRAFFIC) {
        const numDevices = 5;
        let totalSignal = tf.zerosLike(freqAxis);
        
        for(let i=0; i<numDevices; i++) {
             const offset = (i * 2) - 5;
             const centerFreq = 868 + offset;
             // Stochastic hopping
             if (Math.random() > 0.4) {
                const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), 0.1);
                totalSignal = tf.add(totalSignal, tf.mul(mask, tf.scalar(-80)));
             }
        }

        return {
            signal: totalSignal,
            description: "Multiple low-power, short-duty cycle transmissions appearing as sensor mesh.",
            classification: "TRAFFIC INJECTION",
            countermeasure: "Deep Packet Inspection; Analyze transmission periodicity.",
            startFreq: 860,
            endFreq: 875
        };
    }

    return null;
};

/**
 * HEURISTIC NARRATIVE ENGINE
 * Replaces LLM generation. Constructs a deterministic narrative based on math findings.
 */
const generateNarrative = (step: number, time: string, anomalies: Anomaly[], target: string, isAnalysis: boolean): string => {
    const header = `## Timestep ${step + 1}`;
    let narrative = `${header}\n\n`;

    if (isAnalysis) {
        narrative += `### OBSERVATION (${time})\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            narrative += `Spectral analysis confirms a statistically significant energy anomaly between ${a.frequencyStart.toFixed(1)} MHz and ${a.frequencyEnd.toFixed(1)} MHz. \n\n`;
            narrative += `**Signal Characteristics:**\n*   **Classification:** ${a.classification}\n*   **Power Delta:** Exceeds calculated noise floor by >3σ (Standard Deviations).\n*   **Pattern:** Consistent with ${a.classification.toLowerCase()} emission signatures.\n`;
        } else {
            narrative += `The RF spectrum remains nominal. No significant deviations from the baseline noise floor are observed at this interval. Statistical moments (mean/variance) are within established parameters for this environment.\n`;
        }
    } else {
        narrative += `### SITUATION\nSimulated environment time ${time}. \n\n`;
        narrative += `### ACTION\n`;
        if (anomalies.length > 0) {
            narrative += `Red Team executes **${target}** protocols. Emitter active. ${anomalies[0].description}\n\n`;
        } else {
            narrative += `Emitters in standby mode. Passive monitoring of the spectrum.\n\n`;
        }
        narrative += `### IMPACT\n`;
        if (anomalies.length > 0) {
            narrative += `Target systems likely experiencing degraded performance or false positives. Signal-to-Noise Ratio (SNR) in target band has degraded significantly.\n\n`;
        } else {
            narrative += `Nominal operation. Baseline measurements established.\n\n`;
        }
    }
    return narrative;
};

/**
 * MAIN EXECUTION PIPELINE
 * 1. Params -> 2. Tensor Allocation -> 3. Physics Calc -> 4. Anomaly Detection -> 5. Formatting
 */
export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    
    // tf.tidy is CRITICAL here. It creates a sandbox for GPU memory.
    // Any tensor created inside this callback is automatically disposed when it finishes,
    // preventing memory leaks in the browser.
    return tf.tidy(() => {
        const timesteps = params.timesteps;
        const result: AnalysisResult = {
            scenario: "",
            visualizerData: [],
            timeStats: undefined
        };

        let fileReport: FileAnalysisReport | null = null;
        if (analysisContent) {
            fileReport = JSON.parse(analysisContent);
            result.timeStats = fileReport?.timeStats;
        }

        const isAnalysisMode = params.deceptionTarget === DeceptionTarget.ANALYZE_UPLOADED_DATA;
        let scenarioText = "";
        const visualizerData = [];

        // Define Frequency Axis for the Simulation
        let freqStart = 800;
        let freqEnd = 2500;
        let numPoints = 512; // Resolution (Bin count)

        // Adaptive Frequency Scaling
        if (fileReport) {
            freqStart = fileReport.stats.frequency.min;
            freqEnd = fileReport.stats.frequency.max;
        } else if (params.deceptionTarget === DeceptionTarget.JAM_C2_DRONE_LINK) {
            freqStart = 900; freqEnd = 930;
        } else if (params.deceptionTarget === DeceptionTarget.SIMULATE_GPS_SPOOFING) {
            freqStart = 1560; freqEnd = 1590;
        } else if (params.deceptionTarget === DeceptionTarget.SIMULATE_ROGUE_WIFI_AP) {
            freqStart = 2400; freqEnd = 2480;
        }

        const freqAxis = tf.linspace(freqStart, freqEnd, numPoints);
        const freqArray = freqAxis.dataSync(); // Sync for loop usage

        for (let t = 0; t < timesteps; t++) {
            const stepAnomalies: Anomaly[] = [];
            let powerTensor: tf.Tensor;

            if (isAnalysisMode && fileReport) {
                // --- FILE ANALYSIS RECONSTRUCTION ---
                // Since we can't hold 50MB of CSV data in a single tensor for display easily,
                // we reconstruct a "Representative Tensor" based on the statistical report.
                
                const basePower = generateBaselineNoise(EnvironmentType.Urban, InterferenceLevel.Medium, numPoints);
                
                // Inject detected peaks from file into the tensor
                let signalPower = tf.zerosLike(basePower);
                fileReport.samples.peakPowerRows.forEach(peak => {
                    const mask = tf.less(tf.abs(tf.sub(freqAxis, peak.frequency)), 1.0);
                    signalPower = tf.add(signalPower, tf.mul(mask, tf.scalar(peak.power - (-90))));
                });

                // Add temporal jitter to simulate live playback
                const variance = tf.randomNormal([numPoints], 0, 2);
                powerTensor = tf.add(tf.add(basePower, signalPower), variance);

                // --- TENSORFLOW ANOMALY DETECTION ALGORITHM ---
                // 1. Calculate Global Statistics
                const mean = powerTensor.mean();
                const std = tf.moments(powerTensor).variance.sqrt();
                
                // 2. Define Dynamic Threshold (3 Sigma)
                // Threshold = Mean + (3 * StdDev)
                const threshold = mean.add(std.mul(3)); 
                
                // 3. Detect Peaks
                const maxVal = powerTensor.max();
                const maxIdx = powerTensor.argMax();
                
                // 4. Classification Logic
                if (maxVal.dataSync()[0] > threshold.dataSync()[0]) {
                    const idx = maxIdx.dataSync()[0];
                    const freq = freqArray[idx];
                    stepAnomalies.push({
                        description: `Statistically significant energy spike detected at ${freq.toFixed(2)} MHz (Power: ${maxVal.dataSync()[0].toFixed(1)} dBm).`,
                        frequencyStart: freq - 1,
                        frequencyEnd: freq + 1,
                        classification: "ANOMALOUS PEAK",
                        countermeasure: "Isolate frequency and analyze modulation."
                    });
                }

            } else {
                // --- PHYSICS SIMULATION MODE ---
                const noise = generateBaselineNoise(params.environment.type, params.interference, numPoints);
                let finalSignal = noise;

                // Apply Attack Vector Math
                const attack = generateAttackSignal(params.deceptionTarget, freqAxis, timesteps, t);
                
                if (attack) {
                    // Active during middle timesteps
                    if (t > 0 && t < timesteps - 1) {
                        finalSignal = tf.add(finalSignal, attack.signal);
                        stepAnomalies.push({
                            description: attack.description,
                            frequencyStart: attack.startFreq,
                            frequencyEnd: attack.endFreq,
                            classification: attack.classification,
                            countermeasure: attack.countermeasure
                        });
                    }
                }

                powerTensor = finalSignal;
            }

            // Extract Data for UI (CPU Sync)
            const powerArray = powerTensor.dataSync();
            const spectrum: SpectrumDataPoint[] = [];
            for(let i=0; i<numPoints; i++) {
                spectrum.push({ frequency: freqArray[i], power: powerArray[i] });
            }

            visualizerData.push({
                spectrum,
                anomalies: stepAnomalies
            });

            // Generate Narrative
            const timeLabel = `T+${t * 10}s`;
            scenarioText += generateNarrative(t, timeLabel, stepAnomalies, params.deceptionTarget, isAnalysisMode);
        }

        result.scenario = scenarioText;
        result.visualizerData = visualizerData;
        
        return result;
    });
};
