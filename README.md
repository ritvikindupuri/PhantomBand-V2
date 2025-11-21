# PhantomBand: Tensor-Based RF Threat Modeling & Analysis Platform

**PhantomBand is an advanced, client-side platform designed for military-grade electronic warfare (EW) training and signals intelligence (SIGINT) analysis.**

It functions as a high-fidelity **"digital adversary,"** utilizing **TensorFlow.js** to generate deterministic, physics-based Radio Frequency (RF) threat scenarios. Unlike probabilistic LLM-based tools, PhantomBand employs rigorous mathematical models to simulate signal propagation, interference, and spectral anomalies directly in the browser. It generates actionable intelligence, including automated threat classifications and suggested tactical countermeasures, creating an unparalleled environment for developing and mastering electronic warfare TTPs (Tactics, Techniques, and Procedures).

---

## Mission-Critical Capabilities

PhantomBand translates operator intent directly into high-fidelity physics simulations.

### 1. Physics-Based Scenario Generation (`Generate Scenario` Mode)

This is the platform's "digital adversary" function, allowing operators to build complex training scenarios from the ground up using a client-side tensor engine.

#### How it Works:
The operator defines the battlespace controls. When "Generate Simulation" is clicked, the **TensorFlow.js engine** executes a generative mathematical model. It computes noise floors based on environmental constants and injects mathematically defined signal patterns (Gaussian noise, pulsed sine waves, etc.) to represent specific threats.

#### Feature Breakdown:
*   **Environment Modeling:** The Tensor engine mathematically models signal behavior.
    *   `Environment Type` (e.g., *Urban*): Adjusts the mean and standard deviation of the Gaussian noise floor to simulate multipath fading and higher thermal noise.
    *   `Interference Level`: Increases the variance of the random tensors, forcing the operator to find the threat within a statistically cluttered spectrum.
*   **Threat Profile Configuration:**
    *   `Deception Target` (e.g., *Simulate GPS Spoofing*): Triggers a specific generative function. For GPS, it generates a narrowband signal centered precisely at 1575.42 MHz, mathematically indistinguishable from a spoofing attack in a waterfall display.
    *   `Jam C2 Drone Link`: Generates broadband high-energy noise centered on common ISM bands (915 MHz), simulating a denial-of-service attack.

---

### 2. Statistical Data Analysis (`Analyze File` Mode)

This is the "Signal Analyst" function, where PhantomBand ingests real-world data and performs statistical anomaly detection.

#### How it Works:
The operator uploads a RF data file. The application parses the data and loads it into **TensorFlow tensors**. It then performs moment analysis (calculating mean, variance, and standard deviation) to identify statistically significant outliers (e.g., >3 Sigma events). These mathematical findings are then mapped to a narrative template to explain the detected phenomena.

#### Why it's a Game-Changer:
*   **Zero Latency:** All analysis happens instantly on the client machine using WebGL acceleration.
*   **Data Privacy:** No data is ever sent to a cloud API. Top-secret signal data remains air-gapped within the browser context.
*   **Deterministic Output:** The analysis is based on hard math, not AI hallucination.

---

## Technology Stack

-   **Frontend:** React, TypeScript
-   **Physics & Analysis Engine:** TensorFlow.js (`@tensorflow/tfjs`)
-   **Styling:** Tailwind CSS
-   **Data Visualization:** Recharts (Waterfall & FFT)
-   **Client-Side Parsing:** In-house robust CSV/TXT parser

---

## Analyst Workflow

| Step                      | Action (Generate Scenario)                                                                         | Action (Analyze File)                                                                                                   | Outcome                                                                |
| :------------------------ | :------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **1. CONFIGURE/UPLOAD**   | Select the "GENERATE SCENARIO" tab and set simulation parameters.                                    | Select the "ANALYZE FILE" tab and upload a `.csv`/`.txt` file.                                                          | The operational context is defined.                   |
| **2. EXECUTE SIMULATION** | Click "GENERATE SIMULATION" to trigger the TensorFlow graph.                                       | Click "RUN TENSOR ANALYSIS" to load data into tensors and compute stats.                                                | A physics-compliant scenario or statistical report is generated. |
| **3. ANALYZE & CORRELATE** | Use the timeline controls to scrub through the generated spectrum.                                 | Review the narrative generated from the statistical outliers found in your file.                                        | The "waterfall" chart and threat advisory update in perfect sync. |
| **4. DEEP DIVE**          | Switch to the FFT view to analyze the frequency components generated by the tensor engine.         | Switch to the FFT view to conduct a deep analysis of the specific anomalies detected.                                   | Deeper insights into signal characteristics are revealed.                |
| **5. EXPORT & BRIEF**     | Click "Download Report" to generate a comprehensive text file.                                     | Click "Download Report" to generate a report containing the statistical analysis of your file.                          | A complete after-action report is ready. |