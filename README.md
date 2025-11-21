# PhantomBand: Deterministic Tensor-Based RF Threat Simulation

**PhantomBand** is a secure, air-gapped, client-side platform for Electronic Warfare (EW) training and Signals Intelligence (SIGINT) analysis. 

Replacing traditional probabilistic AI with a **Deterministic Physics Engine (TensorFlow.js)**, PhantomBand generates mathematically accurate RF environments and detects anomalies using rigorous statistical analysis—all within the browser. No data leaves the local machine.

---

## Core Architecture: The Physics Engine

PhantomBand utilizes the **PhantomBand Procedural DSP Graph (PB-DSP-v1)** implemented in TensorFlow.js.

1.  **Simulation Mode (Digital Adversary):**
    *   **Input:** Operational parameters (Environment Type, Atmospheric Conditions, Propagation Models).
    *   **Process:** The engine calculates path loss using the **Friis Transmission Equation** and **Hata Model**. It generates noise floors using Gaussian distributions calibrated to **ITU-R P.372** recommendations.
    *   **Output:** Complex signal representations of attacks (GPS Spoofing, Jamming) injected into the noise floor with physics-compliant attenuation.

2.  **Analysis Mode (SIGINT Analyst):**
    *   **Input:** Raw CSV/TXT RF data logs.
    *   **Process:** Data is loaded into GPU-accelerated tensors. The engine performs moment analysis (Mean, Variance, StdDev) to detect **3-Sigma outliers**.
    *   **Output:** Statistical anomaly reports and heuristic tactical narratives.

---

## Key Features

### 1. Physics-Grade Accuracy
Outputs are derived from standard RF equations, not LLM hallucinations.
*   **GPS Spoofing:** Modeled as narrowband signals centered at 1575.42 MHz.
*   **Jamming:** Modeled as high-entropy wideband Gaussian noise.
*   **Atmospheric Attenuation:** Simulates signal loss due to Rain, Fog, or Snow.

### 2. Air-Gapped Security
*   **Client-Side Execution:** All math runs in the user's browser via WebGL.
*   **Zero Data Exfiltration:** Sensitive RF logs are parsed and analyzed locally.

### 3. Instant Performance
*   **GPU Acceleration:** Leveraging WebGL for massive parallel computation of signal tensors and FFTs.

---

## Technology Stack

*   **Core Engine:** TensorFlow.js (`@tensorflow/tfjs`)
*   **Frontend:** React 18, TypeScript
*   **Visualization:** Recharts (Waterfall & Spectral plotting)
*   **Styling:** Tailwind CSS

---

## Usage

1.  **Generate Scenario:** Select an environment and a threat (e.g., "Simulate Rogue Wi-Fi AP"). The engine procedurally generates the signal patterns.
2.  **Analyze File:** Upload a generic CSV of RF data (Frequency, Power). The engine parses it, reconstructs the tensor, and highlights statistical anomalies automatically.
