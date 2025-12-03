import * as tf from '@tensorflow/tfjs';
import { DeceptionTarget, EnvironmentType, InterferenceLevel, SignalPropagationModel, AtmosphericCondition } from '../types.ts';
import type { SimulationParams, AnalysisResult, FileAnalysisReport, SpectrumDataPoint, Anomaly } from '../types.ts';

// --- TENSORFLOW MODEL ARCHITECTURE: PhantomBand Procedural DSP Graph (PB-DSP-v1) ---
//
// MODEL DEFINITION:
// This is a Procedural Physics Graph (PPG).
// It is "Calibrated" via Domain Knowledge Injection rather than "Trained" via Backpropagation.
//
// CALIBRATION SOURCES:
// 1. ITU-R P.372-14: Radio noise constants for specific environments.
// 2. Log-Distance Path Loss Model: Derived from Friis Transmission Equation.
// 3. AWGN (Additive White Gaussian Noise): Information theory entropy modeling.

// ==========================================
// LAYER 1: PHYSICS CALIBRATION (THE "WEIGHTS")
// ==========================================

// CONSTANT: Baseline Thermal Noise (kTB)
// Approx -174 dBm/Hz + 10log(BW). For 20MHz BW, approx -101 dBm.
const THERMAL_NOISE_BASELINE = -105; 

// CALIBRATION: ITU-R P.372-14 Radio Noise
// We inject these "weights" directly into the noise generator.
// Urban = High man-made noise (Mean +20dB). Rural = Low noise.
const ITU_R_NOISE_FIGURES = {
    [EnvironmentType.Urban]: { mean_offset: 20, sigma: 6.0 },
    [EnvironmentType.Suburban]: { mean_offset: 10, sigma: 4.0 },
    [EnvironmentType.Rural]: { mean_offset: 2, sigma: 2.0 },
    [EnvironmentType.Maritime]: { mean_offset: 5, sigma: 1.5 },
    [EnvironmentType.Airborne]: { mean_offset: -2, sigma: 1.0 },
};

// CALIBRATION: AWGN Entropy Scaling (Interference)
// Simulates spectral crowding via variance multiplication.
const AWGN_INTERFERENCE_SCALERS = {
    [InterferenceLevel.Low]: { gain_db: 0, variance_multiplier: 1.0 },
    [InterferenceLevel.Medium]: { gain_db: 5, variance_multiplier: 1.2 },
    [InterferenceLevel.High]: { gain_db: 15, variance_multiplier: 1.8 },
    [InterferenceLevel.Severe]: { gain_db: 25, variance_multiplier: 3.0 }, // Chaotic entropy
};

// CALIBRATION: Atmospheric Attenuation Coefficients (Linear Loss)
const ATMOSPHERIC_LOSS_DB = {
    [AtmosphericCondition.Clear]: 0,
    [AtmosphericCondition.Rainy]: 2.5, // H2O Absorption
    [AtmosphericCondition.Foggy]: 0.5,
    [AtmosphericCondition.Snow]: 1.5,
};

// CALIBRATION: Path Loss Exponents (n)
// Used in Log-Distance Equation: PL = P_tx - 10 * n * log10(d)
const PATH_LOSS_EXPONENTS = {
    [SignalPropagationModel.FreeSpace]: 2.0, // n=2 (Vacuum/LOS)
    [SignalPropagationModel.Hata]: 3.5,      // n=3.5 (Urban Canyon / Hata Model)
    [SignalPropagationModel.LogDistance]: 3.0, // n=3 (Generic Obstructed)
};


// ==========================================
// LAYER 2: PROCEDURAL PHYSICS KERNELS
// ==========================================

/**
 * KERNEL: Ambient Noise Generator
 * Implements: N(f) = Gaussian(Baseline + ITU_Offset + Int_Gain, Sigma * Int_Var)
 */
const generateNoiseFloor = (
    environment: EnvironmentType, 
    interference: InterferenceLevel, 
    numPoints: number
): tf.Tensor => {
    // 1. Retrieve Calibration Constants
    const envParams = ITU_R_NOISE_FIGURES[environment];
    const intParams = AWGN_INTERFERENCE_SCALERS[interference];

    // 2. Calculate Statistical Moments
    const mu = THERMAL_NOISE_BASELINE + envParams.mean_offset + intParams.gain_db;
    const sigma = envParams.sigma * intParams.variance_multiplier;

    // 3. Generate Tensor on GPU
    return tf.randomNormal([numPoints], mu, sigma);
};

/**
 * KERNEL: Propagation Physics Engine
 * Implements: P_rx = P_tx - PathLoss - AtmLoss
 * PathLoss derived from Log-Distance Model (Friis generalization).
 */
const calculateReceivedPower = (
    txPower: number,
    propModel: SignalPropagationModel,
    atmCond: AtmosphericCondition
): number => {
    // Distance Simulation (d): In this demo, we assume a fixed emitter distance of 100m
    const d = 100; 
    
    // 1. Get Path Loss Exponent (n)
    const n = PATH_LOSS_EXPONENTS[propModel];
    
    // 2. Execute Log-Distance Equation
    // PL(dB) = 10 * n * log10(d)
    const pathLoss = 10 * n * Math.log10(d);
    
    // 3. Apply Atmospheric Attenuation
    const atmLoss = ATMOSPHERIC_LOSS_DB[atmCond];

    // 4. Calculate Link Budget
    // Scaling factor 0.5 applied for visual clarity on the graph relative to noise floor
    return txPower - (pathLoss * 0.5) - atmLoss;
};

/**
 * KERNEL: Signal Synthesis (Maxwell's Equations approximation)
 * Generates waveform shapes (Sinc, Gaussian, Sinusoid) representing EM signatures.
 */
const generateThreatSignature = (
    target: DeceptionTarget,
    freqAxis: tf.Tensor,
    params: SimulationParams,
    step: number
): { tensor: tf.Tensor, meta: any } | null => {
    
    // --- SCENARIO 1: GPS SPOOFING ---
    // Physics: Narrowband Continuous Wave (CW) or Sinc Pulse at L1 Band
    if (target === DeceptionTarget.SIMULATE_GPS_SPOOFING) {
        const centerFreq = 1575.42; // GPS L1 Center
        const bw = 2.0; // MHz
        
        // 1. Create Frequency Mask (Bandpass Filter)
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw);
        
        // 2. Calculate Power via Physics Model
        const txPower = -60; // dBm (Spoofer is usually louder than real GPS @ -130)
        const rxPower = calculateReceivedPower(
            txPower, 
            params.environment.propagationModel, 
            params.environment.atmosphericCondition
        );

        // 3. Synthesize Signal
        const signal = tf.mul(mask, tf.scalar(rxPower));
        
        return {
            tensor: signal,
            meta: {
                desc: "Narrowband CW detected at 1575.42 MHz (GPS L1). High-power anomaly indicates non-satellite origin.",
                class: "GPS SPOOFING",
                counter: "Monitor AGC levels; Verify P(Y) code authentication."
            }
        };
    }

    // --- SCENARIO 2: ROGUE WIFI AP ---
    // Physics: DSSS/OFDM Waveform ~20MHz Wide in 2.4GHz Band
    if (target === DeceptionTarget.SIMULATE_ROGUE_WIFI_AP) {
        const centerFreq = 2412; // Channel 1
        const bw = 22; // 802.11b/g bandwidth
        
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw/2);
        
        // Temporal Physics: Beacon Frames occur every ~102ms
        // We simulate this "Pulsing" using the timestep modulo
        const isBeaconFrame = (step % 2 === 0); 
        if (!isBeaconFrame) return null; 

        const txPower = -30; // High power AP
        const rxPower = calculateReceivedPower(
            txPower, 
            params.environment.propagationModel, 
            params.environment.atmosphericCondition
        );

        const signal = tf.mul(mask, tf.scalar(rxPower));
        return {
            tensor: signal,
            meta: {
                desc: "High-amplitude Beacon Frame pulsing on 2.4GHz Ch1. MAC OUI mismatch detected.",
                class: "ROGUE AP",
                counter: "Run WIPS triangulation; Deauth rogue clients."
            }
        };
    }

    // --- SCENARIO 3: JAMMING ---
    // Physics: High Entropy Wideband Gaussian Noise
    if (target === DeceptionTarget.JAM_C2_DRONE_LINK) {
        const centerFreq = 915; // ISM Band
        const bw = 15;
        
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw);
        
        const txPower = -20; // Jammer is very loud
        
        // Generate Jitter (High Variance)
        const jammerEntropy = tf.randomNormal(freqAxis.shape, txPower, 4.0); 
        const signal = tf.mul(mask, jammerEntropy);

        return {
            tensor: signal,
            meta: {
                desc: "Broadband noise floor elevation (+25dB) in ISM band. Characteristic of barrage jamming.",
                class: "C2 JAMMING",
                counter: "Switch to FHSS (Frequency Hopping); Geoloacte source."
            }
        };
    }

    // --- SCENARIO 4: IOT DECOY MESH ---
    // Physics: Frequency Hopping Spread Spectrum (FHSS)
    if (target === DeceptionTarget.GENERATE_DECOY_IOT_TRAFFIC) {
        const numDevices = 5;
        let combinedSignal = tf.zerosLike(freqAxis);
        
        for(let i=0; i<numDevices; i++) {
            // Algorithm: Pseudo-random hopping based on Step + Device ID
            const hopOffset = Math.sin(step * (i+1)) * 10; 
            const centerFreq = 868 + hopOffset;
            const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), 0.2); // Narrow Chirp
            
            const rxPower = -90 + (Math.random() * 5); // Fluctuating power
            combinedSignal = tf.add(combinedSignal, tf.mul(mask, tf.scalar(rxPower)));
        }
        
        return {
            tensor: combinedSignal,
            meta: {
                desc: "Asynchronous LoRaWAN-style chirps detected. Traffic pattern consistent with synthetic mesh.",
                class: "IOT DECOY",
                counter: "Deep Packet Inspection (DPI) required."
            }
        };
    }

    return null;
};

// ==========================================
// LAYER 3: HEURISTIC NARRATIVE ENGINE
// ==========================================

const generateNarrative = (
    step: number, 
    anomalies: Anomaly[], 
    target: string, 
    isAnalysis: boolean,
    params: SimulationParams
): string => {
    const timeStr = `T+${step * 10}ms`;
    let text = `## Timestep ${step + 1}\n\n`;

    if (isAnalysis) {
        text += `### OBSERVATION (${timeStr})\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            text += `**ALERT:** 3-Sigma Anomaly Detected at **${a.frequencyStart.toFixed(1)} MHz**.\n`;
            text += `Signal power exceeds calculated ${params.environment.type} noise floor statistics.\n`;
            text += `**Assessment:** ${a.description}`;
        } else {
            text += `Spectrum nominal. Noise floor consistent with ITU-R P.372 baseline for ${params.environment.type}.`;
        }
    } else {
        text += `### SIMULATION LOG\nTime: ${timeStr} | Env: ${params.environment.type} | Model: ${params.environment.propagationModel}\n\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            text += `**injector:** Synthesizing ${a.classification} vector.\n`;
            text += `**Physics:** Center Freq ~${((a.frequencyStart+a.frequencyEnd)/2).toFixed(1)} MHz | Waveform: ${a.classification === "JAMMING" ? "Gaussian" : "CW/Pulse"}.\n`;
        } else {
            text += `**System:** Emitters silent. Monitoring propagation conditions.\n`;
        }
    }

    return text;
};


// ==========================================
// LAYER 4: ORCHESTRATOR & ANOMALY DETECTION
// ==========================================

export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    
    // tf.tidy executes the graph and then strictly deallocates GPU memory
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

        // Define Spectrum Bounds
        let fStart = 800, fEnd = 2500;
        if (fileReport) {
            fStart = fileReport.stats.frequency.min;
            fEnd = fileReport.stats.frequency.max;
        } else {
            // Dynamic bounds based on target
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
                // --- ANALYSIS MODE ---
                // Reconstruct signal from file stats + noise
                const noise = generateNoiseFloor(EnvironmentType.Urban, InterferenceLevel.Medium, numPoints);
                let signal = tf.zerosLike(noise);
                
                // Reconstruction Logic
                fileReport.samples.peakPowerRows.forEach(peak => {
                    const mask = tf.less(tf.abs(tf.sub(freqAxis, peak.frequency)), 1.0);
                    const peakTensor = tf.mul(mask, tf.scalar(peak.power - (-100)));
                    signal = tf.add(signal, peakTensor);
                });

                finalPowerTensor = tf.add(noise, signal);

            } else {
                // --- SIMULATION MODE ---
                // 1. Generate Environment (ITU-R)
                const noise = generateNoiseFloor(params.environment.type, params.interference, numPoints);
                
                // 2. Generate Threat (Friis/Maxwell)
                const attack = generateThreatSignature(params.deceptionTarget, freqAxis, params, t);
                
                // 3. Superposition
                let combined = noise;
                if (attack) {
                    const signalMask = tf.greater(attack.tensor, -120);
                    const signalWithNoise = tf.add(attack.tensor, noise);
                    combined = tf.where(signalMask, signalWithNoise, noise);

                    stepAnomalies.push({
                        description: attack.meta.desc,
                        frequencyStart: (attack.meta.class === "GPS SPOOFING") ? 1574 : freqArray[0], 
                        frequencyEnd: (attack.meta.class === "GPS SPOOFING") ? 1576 : freqArray[numPoints-1],
                        classification: attack.meta.class,
                        countermeasure: attack.meta.counter
                    });
                }
                finalPowerTensor = combined;
            }

            // --- 3-SIGMA ANOMALY DETECTION (STATISTICAL MOMENTS) ---
            if (fileReport) {
                const mean = finalPowerTensor.mean();
                const std = tf.moments(finalPowerTensor).variance.sqrt();
                
                // Threshold = Mean + 3*Sigma
                const thresh = mean.add(std.mul(3));
                const maxVal = finalPowerTensor.max();
                
                if (maxVal.greater(thresh).dataSync()[0]) {
                    const maxIdx = finalPowerTensor.argMax().dataSync()[0];
                    const freq = freqArray[maxIdx];
                    stepAnomalies.push({
                        description: `Energy peak at ${freq.toFixed(2)} MHz exceeds 3-sigma threshold.`,
                        frequencyStart: freq - 0.5,
                        frequencyEnd: freq + 0.5,
                        classification: "STATISTICAL ANOMALY",
                        countermeasure: "Investigate source."
                    });
                }
            }

            // Extract Data for UI
            const powerArray = finalPowerTensor.dataSync();
            const spectrum: SpectrumDataPoint[] = [];
            for(let i=0; i<numPoints; i++) {
                spectrum.push({ frequency: freqArray[i], power: powerArray[i] });
            }

            fullScenarioText += generateNarrative(t, stepAnomalies, params.deceptionTarget, !!fileReport, params);
            result.visualizerData.push({ spectrum, anomalies: stepAnomalies });
        }

        result.scenario = fullScenarioText;
        return result;
    });
};
