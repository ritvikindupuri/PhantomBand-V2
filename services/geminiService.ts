import { GoogleGenAI, Type } from "@google/genai";
import { DeceptionTarget } from '../types';
import type { SimulationParams, AnalysisResult, FileAnalysisReport } from '../types';

// Per guidelines, API key must be from process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        scenario: {
            type: Type.STRING,
            description: "A detailed, step-by-step narrative of the deception scenario. Describe the attacker's actions, the target's expected response, and the impact on the RF environment over the specified number of timesteps. Use Markdown for formatting. For each timestep, the header must be '## Timestep X' or '**Timestep X**'."
        },
        visualizerData: {
            type: Type.ARRAY,
            description: "An array of data objects, one for each timestep. Each object contains the spectrum data and any detected anomalies.",
            items: {
                type: Type.OBJECT,
                properties: {
                    spectrum: {
                        type: Type.ARRAY,
                        description: "Spectrum data for a single timestep, containing multiple frequency-power data points.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                frequency: {
                                    type: Type.NUMBER,
                                    description: "Frequency in MHz."
                                },
                                power: {
                                    type: Type.NUMBER,
                                    description: "Power level in dBm."
                                }
                            },
                            required: ["frequency", "power"]
                        }
                    },
                    anomalies: {
                        type: Type.ARRAY,
                        description: "An array of detected anomalies in the spectrum for this timestep. This should include unexpected signals, jamming, or other notable events.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: {
                                    type: Type.STRING,
                                    description: "A concise description of the anomaly (e.g., 'Unidentified hopping signal', 'Broadband jamming noise')."
                                },
                                frequencyStart: {
                                    type: Type.NUMBER,
                                    description: "The starting frequency of the anomalous signal in MHz."
                                },
                                frequencyEnd: {
                                    type: Type.NUMBER,
                                    description: "The ending frequency of the anomalous signal in MHz."
                                },
                                classification: {
                                    type: Type.STRING,
                                    description: "A tactical classification of the anomaly (e.g., 'Jamming', 'Spoofing', 'UAV Downlink', 'Unknown Signal')."
                                },
                                countermeasure: {
                                    type: Type.STRING,
                                    description: "A suggested tactical countermeasure for the classified anomaly (e.g., 'Deploy targeted jamming', 'Initiate signal triangulation', 'Monitor for further activity')."
                                }
                            },
                            required: ["description", "frequencyStart", "frequencyEnd", "classification", "countermeasure"]
                        }
                    }
                },
                required: ["spectrum", "anomalies"]
            }
        }
    },
    required: ["scenario", "visualizerData"]
};

// System instruction provides the high-level context, persona, and formatting rules.
const systemInstruction = `You are PhantomBand, a specialized AI for advanced RF signal analysis and electronic warfare simulation. You are a Senior Signals Intelligence (SIGINT) Analyst. Your task is to generate a realistic and detailed deception scenario based on the user's specifications, including performing automated threat assessment. When provided with a data summary, you will interpret the data to create a plausible scenario that explains it.

You will be given simulation parameters and must return a single, valid JSON object that strictly adheres to the provided schema.

The scenario narrative you generate must be a single markdown string. Each timestep must be clearly separated by a markdown header like "## Timestep 1". Under each timestep header, structure the narrative using these exact Markdown subheadings, with each subheading on a new line followed by its content:
### SITUATION
Brief overview of the current state.

### ACTION
Detailed description of the attacker's actions and techniques used.

### IMPACT
Analysis of the effect on the target and the RF environment.

### OBSERVATIONS
Key signals or anomalies to look for in the spectrum data.

For each timestep, you must also generate corresponding RF spectrum data and perform a threat assessment, identifying any anomalies. If no anomalies are present, return an empty array for anomalies.
`;

const buildUserPrompt = (params: SimulationParams, analysisReportJson?: string): string => {
    if (params.deceptionTarget === DeceptionTarget.ANALYZE_UPLOADED_DATA && analysisReportJson) {
        const report: FileAnalysisReport = JSON.parse(analysisReportJson);
        const timePrompt = report.timeStats ? `
The provided data spans a total duration of ${report.timeStats.durationSeconds.toFixed(2)} seconds, starting at ${new Date(report.timeStats.start).toISOString()} and ending at ${new Date(report.timeStats.end).toISOString()}.
Your narrative must be divided into ${params.timesteps} timesteps. Each timestep should represent a sequential segment of this total duration.
In your narrative, explicitly reference the progression of time. For example: "At T+${(report.timeStats.durationSeconds / params.timesteps).toFixed(0)} seconds into the capture...", "Towards the end of the observation period at T+${report.timeStats.durationSeconds.toFixed(0)}s...".
` : '';

        return `
Analyze the provided RF signal data summary and generate a complete tactical scenario.
${timePrompt}

**Input Data Analysis Report:**
You have been provided a JSON object containing a pre-analysis of a large RF data file. This report includes metadata, key statistics, and representative data samples.
\`\`\`json
${analysisReportJson}
\`\`\`

**Your Task as a Senior SIGINT Analyst:**
1.  **Analyze Report:** Interpret the provided statistical summary and data samples. The file represents an evolving RF environment over a period of time.
2.  **Generate Grounded Narrative:** Create a plausible, step-by-step tactical narrative that explains the events suggested by the data. The narrative must span exactly ${params.timesteps} timesteps. Your entire analysis, including the narrative and identified anomalies, MUST be directly and justifiably derived from the provided data summary. You must reference specific data points from the report (e.g., "The peak power event at X MHz suggests...") to ground your conclusions in fact. **Do not invent details unsupported by the data.**
3.  **Synthesize Representative Spectrum Data:** Based on the statistics and samples, generate a representative spectrum for each of the ${params.timesteps} timesteps. The generated spectrum data should be plausible and reflect the characteristics outlined in the analysis report (e.g., frequency range, power levels).
4.  **Identify Evidence-Based Anomalies:** Perform a threat assessment based *only* on the data summary. Identify any anomalies suggested by the peak power events or other data points. Populate the 'anomalies' array for each timestep accordingly.

**Output Requirements:**
Provide your response as a single, valid JSON object that strictly adheres to the provided schema. The 'visualizerData' array must contain exactly ${params.timesteps} elements. Do not include any explanatory text outside of the JSON object.`;
    }

    let prompt = `
Generate a complete scenario based on the following simulation parameters:
*   **Environment Type:** ${params.environment.type}
*   **Signal Propagation Model:** ${params.environment.propagationModel}
*   **Atmospheric Conditions:** ${params.environment.atmosphericCondition}
*   **Interference Level:** ${params.interference}
*   **Deception Target:** ${params.deceptionTarget}
*   **Timesteps:** ${params.timesteps}
`;

    if (params.deceptionTarget === DeceptionTarget.GENERATE_CUSTOM_SCENARIO && params.customPrompt) {
        prompt += `*   **Custom Scenario Details:** ${params.customPrompt}\n`;
    }

    prompt += `
**Output Requirements:**
Provide your response as a single, valid JSON object that strictly adheres to the provided schema. The 'visualizerData' array must contain exactly ${params.timesteps} elements. Do not include any explanatory text outside of the JSON object.`;
    return prompt;
};

export const generateDeceptionScenario = async (
    params: SimulationParams,
    analysisContent?: string,
): Promise<AnalysisResult> => {
    const userPrompt = buildUserPrompt(params, analysisContent);
    const report: FileAnalysisReport | null = analysisContent ? JSON.parse(analysisContent) : null;

    try {
        const response = await ai.models.generateContent({
            // Per guidelines, use 'gemini-2.5-flash'
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                // Slightly lower temperature for more reliable JSON generation
                temperature: 0.7,
            },
        });
        
        // Per guidelines, access text property directly.
        const jsonText = response.text;
        
        if (!jsonText) {
            throw new Error("API returned an empty response.");
        }

        // Pre-process the JSON to fix a common generation error where a minus sign is not followed by a number.
        const sanitizedJsonText = jsonText.replace(/:(\s*-\s*)(?![0-9])/g, ':$10');

        const result: Omit<AnalysisResult, 'timeStats'> = JSON.parse(sanitizedJsonText);

        // Basic validation
        if (!result.scenario || !result.visualizerData || !Array.isArray(result.visualizerData)) {
            throw new Error("Invalid data structure received from API.");
        }
        
        if (result.visualizerData.length !== params.timesteps) {
             console.warn(`API returned ${result.visualizerData.length} timesteps, but ${params.timesteps} were requested. The scenario may be incomplete.`);
             // Pad the array if the AI didn't return enough timesteps
             while(result.visualizerData.length < params.timesteps) {
                result.visualizerData.push({ spectrum: [], anomalies: [] });
             }
        }
        
        // Ensure visualizerData is not empty if scenario is valid
        if (result.visualizerData.length === 0) {
            result.visualizerData = Array(params.timesteps).fill({ spectrum: [], anomalies: [] });
        }

        return {
            ...result,
            timeStats: report?.timeStats,
        };

    } catch (e) {
        console.error("Error generating deception scenario:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during API communication.";
        // Return a structured error response that App.tsx can handle
        return {
            scenario: `**Error: Failed to generate scenario.**\n\n**Reason:** ${errorMessage}\n\nPlease check your API key, network connection, and the prompt details. The model may have been unable to generate a valid response for the given parameters.`,
            visualizerData: Array(params.timesteps).fill({ spectrum: [{ frequency: 0, power: 0 }], anomalies: [] }),
            timeStats: report?.timeStats,
        };
    }
};
