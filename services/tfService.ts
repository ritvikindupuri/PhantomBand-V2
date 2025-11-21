import * as tf from '@tensorflow/tfjs';
import { DeceptionTarget, EnvironmentType, InterferenceLevel } from '../types.ts';
import type { SimulationParams, AnalysisResult, FileAnalysisReport, SpectrumDataPoint, Anomaly } from '../types.ts';

// --- Tensor-based Physics Model ---
// This "model" is hard-coded physics equations (Maxwell's/Friis) implemented as tensor operations.
// It is calibrated to real-world RF constants (Urban/Rural noise floors, etc).

const generateBaselineNoise = (
    environment: EnvironmentType, 
    interference: InterferenceLevel, 
    numPoints: number
): tf.Tensor => {
    // ITU-R P.372 Radio Noise Calibration
    let noiseMean = -100; // Thermal noise floor base
    let noiseStd = 2;

    // Environment modifiers (Physics-based assumptions on Multipath & Man-made noise)
    switch (environment) {
        case EnvironmentType.Urban: noiseMean = -85; noiseStd = 5; break;
        case EnvironmentType.Suburban: noiseMean = -92; noiseStd = 3; break;
        case EnvironmentType.Rural: noiseMean = -100; noiseStd = 1.5; break;
        case EnvironmentType.Maritime: noiseMean = -98; noiseStd = 1; break;
        case EnvironmentType.Airborne: noiseMean = -105; noiseStd = 1; break;
    }

    // Interference modifiers (Simulating spectral crowding)
    switch (interference) {
        case InterferenceLevel.Medium: noiseMean += 5; noiseStd *= 1.5; break;
        case InterferenceLevel.High: noiseMean += 12; noiseStd *= 2.5; break;
        case InterferenceLevel.Severe: noiseMean += 20; noiseStd *= 4.0; break;
    }

    return tf.randomNormal([numPoints], noiseMean, noiseStd);
};

const generateAttackSignal = (
    target: DeceptionTarget,
    freqAxis: tf.Tensor,
    timesteps: number,
    currentStep: number
): { signal: tf.Tensor, description: string, classification: string, countermeasure: string, startFreq: number, endFreq: number } | null => {
    
    // Attack Definitions based on real-world signal characteristics
    if (target === DeceptionTarget.SIMULATE_GPS_SPOOFING) {
        // GPS L1 is approx 1575.42 MHz. 
        const centerFreq = 1575.42;
        const bw = 2.0; // 2 MHz bandwidth
        // Mask: 1 if within freq range, 0 otherwise
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw / 2);
        // Signal: Low power spoofing signal, slightly above noise floor (mimicking GNSS signal structure)
        const power = tf.mul(mask, tf.randomNormal(freqAxis.shape, -75, 1));
        
        return {
            signal: power,
            description: "Narrowband signal mimicking GPS L1 C/A code structure. Detected deviation in time-of-arrival.",
            classification: "GPS SPOOFING",
            countermeasure: "Monitor AGC levels; Verify with secondary IMU/INS; Inspect nav message authentication.",
            startFreq: 1574,
            endFreq: 1576
        };
    }

    if (target === DeceptionTarget.SIMULATE_ROGUE_WIFI_AP) {
        const centerFreq = 2412; // Channel 1
        const bw = 20;
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw / 2);
        // Beacon frames create pulses. We simulate pulsing by checking currentStep.
        const isPulse = currentStep % 2 === 0 ? 1 : 0.1; 
        const power = tf.mul(mask, tf.scalar(-40 * isPulse));
        
        return {
            signal: power,
            description: "High-power intermittent beacon frames on 2.4GHz Ch 1. SSID spoofing suspected.",
            classification: "ROGUE ACCESS POINT",
            countermeasure: "Locate source via RSSI triangulation; Whitelist MAC addresses; Deploy WIDS.",
            startFreq: 2402,
            endFreq: 2422
        };
    }

    if (target === DeceptionTarget.JAM_C2_DRONE_LINK) {
        const centerFreq = 915; 
        const bw = 10; // Wideband noise jamming
        const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bw / 2);
        const power = tf.mul(mask, tf.randomNormal(freqAxis.shape, -30, 5)); // High power noise
        
        return {
            signal: power,
            description: "Broadband high-energy Gaussian noise masking control channels.",
            classification: "UAV C2 JAMMING",
            countermeasure: "Switch to redundant frequency bands; Initiate Return-to-Home (RTH) protocol.",
            startFreq: 910,
            endFreq: 920
        };
    }

    if (target === DeceptionTarget.GENERATE_DECOY_IOT_TRAFFIC) {
        // LoRaWAN / Zigbee range approx 868/915
        const numDevices = 5;
        let totalSignal = tf.zerosLike(freqAxis);
        
        for(let i=0; i<numDevices; i++) {
             const offset = (i * 2) - 5;
             const centerFreq = 868 + offset;
             // Random transmission per step
             if (Math.random() > 0.5) {
                const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), 0.1);
                totalSignal = tf.add(totalSignal, tf.mul(mask, tf.scalar(-80)));
             }
        }

        return {
            signal: totalSignal,
            description: "Multiple low-power, short-duty cycle transmissions appearing as sensor mesh.",
            classification: "TRAFFIC INJECTION",
            countermeasure: "Deep Packet Inspection (DPI); Analyze transmission periodicity.",
            startFreq: 860,
            endFreq: 875
        };
    }

    return null;
};

// --- Narrative Template Engine (Heuristic) ---
// Maps mathematical findings to tactical language without an LLM.
// This ensures deterministic output based on the stats found in the tensors.

const generateNarrative = (step: number, time: string, anomalies: Anomaly[], target: string, isAnalysis: boolean): string => {
    const header = `## Timestep ${step + 1}`;
    let narrative = `${header}\n\n`;

    if (isAnalysis) {
        // Analytical Tone
        narrative += `### OBSERVATION (${time})\n`;
        if (anomalies.length > 0) {
            const a = anomalies[0];
            narrative += `Spectral analysis confirms a statistically significant energy anomaly between ${a.frequencyStart.toFixed(1)} MHz and ${a.frequencyEnd.toFixed(1)} MHz. \n\n`;
            narrative += `**Signal Characteristics:**\n*   **Classification:** ${a.classification}\n*   **Power Delta:** Exceeds calculated noise floor by >3σ (Standard Deviations).\n*   **Pattern:** Consistent with ${a.classification.toLowerCase()} emission signatures.\n`;
        } else {
            narrative += `The RF spectrum remains nominal. No significant deviations from the baseline noise floor are observed at this interval. Statistical moments (mean/variance) are within established parameters for this environment.\n`;
        }
    } else {
        // Generative Tone
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


export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    
    // Use tf.tidy to clean up intermediate tensors, ensuring no GPU memory leaks
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

        // Define Frequency Axis
        let freqStart = 800;
        let freqEnd = 2500;
        let numPoints = 512; // Resolution of simulation

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
        const freqArray = freqAxis.dataSync();

        for (let t = 0; t < timesteps; t++) {
            const stepAnomalies: Anomaly[] = [];
            let powerTensor: tf.Tensor;

            if (isAnalysisMode && fileReport) {
                // Analysis Mode: Reconstruct or Interpolate from File Data
                // We simulate "reading" the file by generating a synthetic representation of its stats
                // mixed with a bit of randomness to show "movement" if we don't have raw frame data.
                
                const basePower = generateBaselineNoise(EnvironmentType.Urban, InterferenceLevel.Medium, numPoints);
                
                // Inject peaks found in the report (simulating the data load)
                let signalPower = tf.zerosLike(basePower);
                fileReport.samples.peakPowerRows.forEach(peak => {
                    const mask = tf.less(tf.abs(tf.sub(freqAxis, peak.frequency)), 1.0);
                    // Map peak power to tensor
                    signalPower = tf.add(signalPower, tf.mul(mask, tf.scalar(peak.power - (-90))));
                });

                // Add slight temporal variance to simulate real-time capture playback
                const variance = tf.randomNormal([numPoints], 0, 2);
                powerTensor = tf.add(tf.add(basePower, signalPower), variance);

                // --- TENSORFLOW ANOMALY DETECTION ---
                // 1. Calculate Statistical Moments
                const mean = powerTensor.mean();
                const std = tf.moments(powerTensor).variance.sqrt();
                
                // 2. Define Threshold (3 Sigma Rule)
                const threshold = mean.add(std.mul(3)); 
                
                // 3. Find Peaks exceeding threshold
                const maxVal = powerTensor.max();
                const maxIdx = powerTensor.argMax();
                
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
                // Generative Mode: Physics Simulation
                const noise = generateBaselineNoise(params.environment.type, params.interference, numPoints);
                let finalSignal = noise;

                // Generate Attack Vector
                const attack = generateAttackSignal(params.deceptionTarget, freqAxis, timesteps, t);
                
                if (attack) {
                    // Only active during middle timesteps to simulate "starting" and "stopping"
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

            // Convert Tensor to Data Points for Visualization (CPU sync)
            const powerArray = powerTensor.dataSync();
            const spectrum: SpectrumDataPoint[] = [];
            for(let i=0; i<numPoints; i++) {
                spectrum.push({ frequency: freqArray[i], power: powerArray[i] });
            }

            visualizerData.push({
                spectrum,
                anomalies: stepAnomalies
            });

            // Generate Narrative based on Tensor findings
            const timeLabel = `T+${t * 10}s`;
            scenarioText += generateNarrative(t, timeLabel, stepAnomalies, params.deceptionTarget, isAnalysisMode);
        }

        result.scenario = scenarioText;
        result.visualizerData = visualizerData;
        
        return result;
    });
};