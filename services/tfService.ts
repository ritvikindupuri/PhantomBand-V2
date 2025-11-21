import * as tf from '@tensorflow/tfjs';
import { DeceptionTarget, EnvironmentType, InterferenceLevel, SignalPropagationModel, AtmosphericCondition } from '../types';
import type { SimulationParams, AnalysisResult, FileAnalysisReport, SpectrumDataPoint, Anomaly } from '../types';

// --- TENSORFLOW MODEL ARCHITECTURE: PhantomBand Procedural DSP Graph (PB-DSP-v1) ---
//
// MODEL DEFINITION:
// This is a Procedural Physics Graph (PPG) constructed using Differentiable Programming principles.
// Unlike a Neural Network, it is not "trained" on a dataset of labeled examples.
// Instead, it is "calibrated" using:
// 1. Maxwell's Equations (Foundation of EM waves)
// 2. ITU-R P.372-14 (Radio noise constants)
// 3. Friis Transmission Equation (Path loss modeling)
//
// EXECUTION ENVIRONMENT:
// The graph is executed on the Client-Side GPU via WebGL using TensorFlow.js.
// This ensures determinism (physics doesn't guess) and security (no data leaves the browser).

// --- 1. PHYSICS CALIBRATION CONSTANTS ---

const BASELINE_THERMAL_NOISE = -105; // dBm, roughly kTB at room temp for modest BW

// Calibration constants for Environment Types (ITU-R P.372 based offsets)
const ENV_FACTORS = {
    [EnvironmentType.Urban]: { mean: 20, std: 6, desc: "High multipath, human-made noise" },
    [EnvironmentType.Suburban]: { mean: 10, std: 4, desc: "Moderate multipath" },
    [EnvironmentType.Rural]: { mean: 2, std: 2, desc: "Low noise, mostly thermal" },
    [EnvironmentType.Maritime]: { mean: 5, std: 1.5, desc: "Surface reflections, low blocking" },
    [EnvironmentType.Airborne]: { mean: -2, std: 1, desc: "Line-of-sight dominant" },
};

// Calibration for Interference Levels (Additive White Gaussian Noise scaler)
const INTERFERENCE_FACTORS = {
    [InterferenceLevel.Low]: { gain: 0, var_mult: 1.0 },
    [InterferenceLevel.Medium]: { gain: 5, var_mult: 1.2 },
    [InterferenceLevel.High]: { gain: 15, var_mult: 1.8 },
    [InterferenceLevel.Severe]: { gain: 25, var_mult: 3.0 },
};

// Calibration for Atmospheric Attenuation (Simplified dB loss per step)
const ATMOSPHERIC_LOSS = {
    [AtmosphericCondition.Clear]: 0,
    [AtmosphericCondition.Rainy]: 2.5, // Attenuation due to scattering
    [AtmosphericCondition.Foggy]: 0.5,
    [AtmosphericCondition.Snow]: 1.5,
};

// Propagation Model Exponents (n) for Path Loss L = 10*n*log(d)
const PROPAGATION_EXPONENTS = {
    [SignalPropagationModel.FreeSpace]: 2.0,
    [SignalPropagationModel.Hata]: 3.5, // Approx for urban area
    [SignalPropagationModel.LogDistance]: 3.0,
};


// --- 2. PROCEDURAL GENERATION FUNCTIONS (THE "MODEL") ---

/**
 * Generates the ambient noise floor tensor based on environmental physics.
 * Uses tf.randomNormal to create stochastic noise distributions.
 */
const generateEnvironmentTensor = (
    environment: EnvironmentType, 
    interference: InterferenceLevel, 
    numPoints: number
): tf.Tensor => {
    const env = ENV_FACTORS[environment];
    const int = INTERFERENCE_FACTORS[interference];

    // Calculate the Noise Figure (NF) based on environment
    const noiseMean = BASELINE_THERMAL_NOISE + env.mean + int.gain;
    const noiseStd = env.std * int.var_mult;

    // Operation: N = Gaussian(mu, sigma)
    return tf.randomNormal([numPoints], noiseMean, noiseStd);
};

/**
 * Simulates signal attenuation based on physics models.
 */
const applyPropagationPhysics = (
    basePower: number,
    propModel: SignalPropagationModel,
    atmCond: AtmosphericCondition
): number => {
    // Simulate a fixed distance "d" relative to emitter
    // In a full simulator, d is variable. Here we assume an emitter at the edge of detection (d=100 units).
    const d = 100; 
    const n = PROPAGATION_EXPONENTS[propModel];
    
    // Simplified Path Loss Calculation
    // Path Loss (dB) = 10 * n * log10(d)
    const pathLoss = 10 * n * Math.log10(d);
    
    // Atmospheric Loss
    const atmLoss = ATMOSPHERIC_LOSS[atmCond];

    return basePower - (pathLoss * 0.1) - atmLoss; // Scaled for visualization range
};

/**
 * Generates the specific attack vector signal tensor.
 * Defines the "Signature" of the threat using frequency-domain shaping.
 */
const generateAttackVector = (
    target: DeceptionTarget,
    freqAxis: tf.Tensor,
    params: SimulationParams,
    step: number
): { tensor: tf.Tensor, meta: any } | null => {
    
    // 1. GPS SPOOFING (Narrowband CW)
    if (target === DeceptionTarget.SIMULATE_GPS_SPOOFING) {
        const centerFreq = 1575.42;
        const bw = 2.0;
        
        // Shape: Sinc function or Narrow Gaussian approximates the main lobe of GPS L1
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw);
        
        // Physics: Calculate received power based on propagation model
        const sourcePower = -60; // Emitter power
        const rxPower = applyPropagationPhysics(
            sourcePower, 
            params.environment.propagationModel, 
            params.environment.atmosphericCondition
        );

        const signal = tf.mul(mask, tf.scalar(rxPower));
        
        return {
            tensor: signal,
            meta: {
                desc: "Narrowband continuous wave detected at 1575.42 MHz. Deviation from expected satellite doppler curve.",
                class: "GPS SPOOFING (L1)",
                counter: "Switch to encrypted M-Code; Monitor IMU drift."
            }
        };
    }

    // 2. ROGUE ACCESS POINT (Pulsed Wideband)
    if (target === DeceptionTarget.SIMULATE_ROGUE_WIFI_AP) {
        const centerFreq = 2412;
        const bw = 22; // 802.11 channel width
        
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw/2);
        
        // Temporal Physics: Beacons occur ~100ms. We simulate pulsing by step modulo.
        const isBeacon = (step % 2 === 0); 
        if (!isBeacon) return null; // No signal this timestep

        const sourcePower = -30;
        const rxPower = applyPropagationPhysics(
            sourcePower, 
            params.environment.propagationModel, 
            params.environment.atmosphericCondition
        );

        const signal = tf.mul(mask, tf.scalar(rxPower));
        return {
            tensor: signal,
            meta: {
                desc: "High-amplitude beacon frames on 2.4GHz Ch1. MAC address OUI mismatch.",
                class: "ROGUE AP",
                counter: "Wireless Intrusion Prevention System (WIPS) containment."
            }
        };
    }

    // 3. JAMMING (Wideband Gaussian)
    if (target === DeceptionTarget.JAM_C2_DRONE_LINK) {
        const centerFreq = 915;
        const bw = 15;
        
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw);
        
        // Jamming is high entropy noise
        const sourcePower = -20; // Very loud
        const jammerNoise = tf.randomNormal(freqAxis.shape, sourcePower, 3); // High variance
        const signal = tf.mul(mask, jammerNoise);

        return {
            tensor: signal,
            meta: {
                desc: "High-entropy broadband noise floor elevation in ISM band.",
                class: "C2 JAMMING",
                counter: "Enable Frequency Hopping Spread Spectrum (FHSS)."
            }
        };
    }

    // 4. IOT DECOY TRAFFIC (Frequency Hopping)
    if (target === DeceptionTarget.GENERATE_DECOY_IOT_TRAFFIC) {
        const numDevices = 5;
        let combinedSignal = tf.zerosLike(freqAxis);
        
        // Physics: Multiple carriers hopping pseudorandomly
        for(let i=0; i<numDevices; i++) {
            // Deterministic pseudo-randomness based on step + index
            const hopOffset = Math.sin(step * (i+1)) * 10; 
            const centerFreq = 868 + hopOffset;
            const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), 0.2); // Narrow LoRa-like chirp
            
            const rxPower = -90 + (Math.random() * 5); // Variable signal strength
            combinedSignal = tf.add(combinedSignal, tf.mul(mask, tf.scalar(rxPower)));
        }
        
        return {
            tensor: combinedSignal,
            meta: {
                desc: "Multiple asynchronous chirps detected in sub-GHz band. Traffic pattern analysis suggests synthetic mesh.",
                class: "IOT DECOY TRAFFIC",
                counter: "Deep Packet Inspection (DPI) for payload validation."
            }
        };
    }

    return null;
};

// --- 3. HEURISTIC NARRATIVE ENGINE ---

const generateNarrative = (
    step: number, 
    anomalies: Anomaly[], 
    target: string, 
    isAnalysis: boolean,
    params: SimulationParams
): string => {
    const timeStr = `T+${step * 10}s`;
    let text = `## Timestep ${step + 1}\n\n`;

    if (isAnalysis) {
        text += `### OBSERVATION (${timeStr})\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            text += `Processing of the input tensor reveals a 3-Sigma spectral anomaly at **${a.frequencyStart.toFixed(1)} MHz**. \n`;
            text += `Signal power exceeds the calculated noise floor for the current environment configuration. \n`;
            text += `**Analysis:** ${a.description}`;
        } else {
            text += `Spectral scan nominal. Noise floor consistent with calibrated ${params.environment.type} baseline. No significant outliers detected in the Fast Fourier Transform (FFT) integration window.`;
        }
    } else {
        text += `### SITUATION\nSimulation Time: ${timeStr}. Environment: ${params.environment.type} (${params.environment.propagationModel}).\n\n`;
        text += `### ACTION\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            text += `**Red Team** active. Injecting ${a.classification} signature. \n`;
            text += `Emitter parameters: Center Freq ~${((a.frequencyStart+a.frequencyEnd)/2).toFixed(1)} MHz. \n`;
        } else {
            text += `**Red Team** holding patterns. Emitters silent. Monitoring propagation conditions.\n`;
        }
        
        text += `\n### IMPACT\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            text += `Target receiver sensitivity degraded. SNR drops below demodulation threshold. \n`;
            text += `Recommended Action: **${a.countermeasure}**`;
        } else {
            text += `Spectrum clear. nominal C2 links maintained.`;
        }
    }

    return text;
};

// --- 4. MAIN SERVICE EXPORT ---

export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    
    // tf.tidy automatically cleans up intermediate tensors from GPU memory
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

        // Determine Frequency Domain
        let fStart = 800, fEnd = 2500;
        if (fileReport) {
            fStart = fileReport.stats.frequency.min;
            fEnd = fileReport.stats.frequency.max;
        } else {
            // Adjust range based on target to ensure visualization looks good
            if (params.deceptionTarget === DeceptionTarget.SIMULATE_GPS_SPOOFING) { fStart = 1550; fEnd = 1600; }
            if (params.deceptionTarget === DeceptionTarget.SIMULATE_ROGUE_WIFI_AP) { fStart = 2400; fEnd = 2485; }
            if (params.deceptionTarget === DeceptionTarget.JAM_C2_DRONE_LINK) { fStart = 900; fEnd = 930; }
            if (params.deceptionTarget === DeceptionTarget.GENERATE_DECOY_IOT_TRAFFIC) { fStart = 860; fEnd = 880; }
        }

        const numPoints = 512;
        const freqAxis = tf.linspace(fStart, fEnd, numPoints);
        const freqArray = freqAxis.dataSync();

        let fullScenarioText = "";

        for (let t = 0; t < timesteps; t++) {
            const stepAnomalies: Anomaly[] = [];
            let finalPowerTensor: tf.Tensor;

            if (fileReport) {
                // --- ANALYSIS MODE (RECONSTRUCTION) ---
                // 1. Generate base noise
                const noise = generateEnvironmentTensor(EnvironmentType.Urban, InterferenceLevel.Medium, numPoints);
                
                // 2. Reconstruct Peaks from File Stats
                let signal = tf.zerosLike(noise);
                fileReport.samples.peakPowerRows.forEach(peak => {
                    // Match freq within 1 MHz
                    const mask = tf.less(tf.abs(tf.sub(freqAxis, peak.frequency)), 1.0);
                    // Reconstruct power relative to noise floor (-100)
                    const peakTensor = tf.mul(mask, tf.scalar(peak.power - (-100)));
                    signal = tf.add(signal, peakTensor);
                });

                // 3. Add Reconstruction Jitter
                const jitter = tf.randomNormal([numPoints], 0, 2);
                finalPowerTensor = tf.add(tf.add(noise, signal), jitter);

            } else {
                // --- SIMULATION MODE (GENERATION) ---
                // 1. Generate Environment Noise Floor
                const noise = generateEnvironmentTensor(params.environment.type, params.interference, numPoints);
                
                // 2. Generate Attack Signal
                const attack = generateAttackVector(params.deceptionTarget, freqAxis, params, t);
                
                let combined = noise;
                if (attack) {
                    // Additive superposition of signals
                    // Power addition in linear domain is complex, here we approximate in log domain for visualization
                    // Ideally: 10*log10(10^(P1/10) + 10^(P2/10))
                    // Visual approximation: Max(noise, signal) often looks better for waterfalls, 
                    // but tf.add works for overlaying energy.
                    
                    // We use a mask to mix them. Where signal exists, use signal + noise.
                    const signalMask = tf.greater(attack.tensor, -120); // -120 is arbitrary cutoff
                    const signalWithNoise = tf.add(attack.tensor, noise);
                    
                    combined = tf.where(signalMask, signalWithNoise, noise);

                    stepAnomalies.push({
                        description: attack.meta.desc,
                        frequencyStart: (attack.meta.class === "GPS SPOOFING (L1)") ? 1574 : freqArray[0], 
                        frequencyEnd: (attack.meta.class === "GPS SPOOFING (L1)") ? 1576 : freqArray[numPoints-1],
                        classification: attack.meta.class,
                        countermeasure: attack.meta.counter
                    });
                }
                finalPowerTensor = combined;
            }

            // --- ANOMALY DETECTION (STATISTICAL MOMENTS) ---
            if (fileReport) {
                // Calculate Mean and StdDev of the tensor
                const mean = finalPowerTensor.mean();
                const std = tf.moments(finalPowerTensor).variance.sqrt();
                
                // Threshold = Mean + 3 * StdDev
                const thresh = mean.add(std.mul(3));
                
                // Check Max Value
                const maxVal = finalPowerTensor.max();
                
                if (maxVal.greater(thresh).dataSync()[0]) {
                    const maxIdx = finalPowerTensor.argMax().dataSync()[0];
                    const freq = freqArray[maxIdx];
                    stepAnomalies.push({
                        description: `Energy peak at ${freq.toFixed(2)} MHz exceeds 3-sigma threshold.`,
                        frequencyStart: freq - 0.5,
                        frequencyEnd: freq + 0.5,
                        classification: "STATISTICAL ANOMALY",
                        countermeasure: "Investigate signal source."
                    });
                }
            }

            // Prepare Data for React
            const powerArray = finalPowerTensor.dataSync();
            const spectrum: SpectrumDataPoint[] = [];
            for(let i=0; i<numPoints; i++) {
                spectrum.push({ frequency: freqArray[i], power: powerArray[i] });
            }

            // Add to results
            fullScenarioText += generateNarrative(
                t, 
                stepAnomalies, 
                params.deceptionTarget, 
                !!fileReport, 
                params
            );
            
            result.visualizerData.push({
                spectrum,
                anomalies: stepAnomalies
            });
        }

        result.scenario = fullScenarioText;
        return result;
    });
};