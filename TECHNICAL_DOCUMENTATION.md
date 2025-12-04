# A Formal Technical Specification and Architectural Analysis of the PhantomBand Platform

**Version:** 2.0 (TensorFlow.js Implementation)
**Classification:** Engineering & Architectural Review
**Audience:** Technical Leads, System Architects, Principal Engineers

---

## Table of Contents
1.  [**Introduction**](#1-introduction)
    *   [1.1. Document Mandate](#11-document-mandate)
    *   [1.2. Technical Abstract](#12-technical-abstract)
2.  [**System Architecture**](#2-system-architecture)
    *   [2.1. Client-Side Compute Paradigm](#21-client-side-compute-paradigm)
    *   [2.2. TensorFlow.js Integration](#22-tensorflowjs-integration)
3.  [**Core Analytic Subsystem: The Physics Engine**](#3-core-analytic-subsystem-the-physics-engine)
    *   [3.1. Generative Signal Modeling](#31-generative-signal-modeling)
    *   [3.2. Tensor-Based Anomaly Detection](#32-tensor-based-anomaly-detection)
4.  [**Data Flows**](#4-data-flows)
5.  [**Key Component Implementation**](#5-key-component-implementation)

---

## 1. Introduction

### 1.1. Document Mandate
This document delineates the architecture of PhantomBand v2.0, focusing on its migration from a cloud-based probabilistic AI model to a **deterministic, client-side physics engine** powered by TensorFlow.js.

### 1.2. Technical Abstract
PhantomBand is a React-based Single Page Application (SPA) that leverages **TensorFlow.js** for high-performance numerical computation in the browser. It implements a **Generative Signal Model (GSM)** using tensor operations to simulate complex Radio Frequency (RF) environments. By removing external API dependencies, the platform achieves **Air-Gap Compliance**, ensuring that sensitive signal data is processed exclusively within the local execution context.

---

## 2. System Architecture

### 2.1. Client-Side Compute Paradigm
The architecture is strictly client-centric. All "intelligence" is derived from mathematical operations performed on the user's GPU/CPU via WebGL or WASM backends provided by TensorFlow.js.

```mermaid
graph TD
    subgraph "User's Browser (Local Execution)"
        A[Analyst] -- Input --> B(React UI);
        B -- "Triggers" --> C[TensorFlow.js Service];
        
        subgraph "TensorFlow.js Engine"
            C -- "Allocates" --> D[Tensors (GPU/WebGL)];
            D -- "Math Ops (add, mul, randomNormal)" --> E[Physics Simulation];
            E -- "Statistics (moments, max)" --> F[Anomaly Detection];
            F -- "Mapping" --> G[Narrative Template Engine];
        end

        G -- "JSON Result" --> B;
        B -- "Renders" --> A;
    end
```

### 2.2. TensorFlow.js Integration
The `tfService.ts` module acts as the bridge between the React view layer and the TensorFlow compute graph. It utilizes `tf.tidy()` blocks to rigorously manage GPU memory, ensuring intermediate tensors created during the simulation loop are immediately disposed of to prevent memory leaks during long-running sessions.

---

## 3. Core Analytic Subsystem: The Physics Engine

### 3.1. Generative Signal Modeling
Instead of prompting an LLM to "imagine" a signal, PhantomBand v2.0 constructs it mathematically.

*   **Noise Generation:**
    $$ N(f) \sim \mathcal{N}(\mu_{env}, \sigma_{int}^2) $$
    The baseline noise is generated using `tf.randomNormal`. The mean ($\mu$) and variance ($\sigma^2$) are derived dynamically from the `EnvironmentType` and `InterferenceLevel` selected by the user.

*   **Signal Injection:**
    Target signals are modeled as additive components.
    *   *GPS Spoofing:* Modeled as a localized power increase within a 2MHz bandwidth at 1575.42 MHz.
    *   *Jamming:* Modeled as high-variance additive Gaussian noise over a wide frequency band.
    
    This is implemented via tensor masking:
    ```typescript
    const mask = tf.less(tf.abs(tf.sub(freqAxis, centerFreq)), bandwidth / 2);
    const signal = tf.mul(mask, tf.randomNormal(...));
    const output = tf.add(backgroundNoise, signal);
    ```

### 3.2. Tensor-Based Anomaly Detection
For data analysis, the system implements a statistical outlier detection algorithm using tensor operations:
1.  **Moment Calculation:** Compute $\mu$ (mean) and $\sigma$ (std dev) of the power spectrum tensor.
2.  **Thresholding:** Define an anomaly threshold $T = \mu + 3\sigma$.
3.  **Detection:** Use `tf.greater(signal, T)` to create a boolean mask of anomalous frequencies.

This provides a mathematically rigorous definition of an "anomaly," eliminating the hallucinations common in LLM-based analysis.

---

## 4. Data Flows & Security

*   **Input:** User parameters or local files (`.csv`).
*   **Processing:** Data is converted to `Float32Array` and loaded into `tf.Tensor` objects.
*   **Output:** Tensors are synchronized back to CPU (`dataSync()`) only when necessary for visualization, keeping the heavy lifting on the GPU.
*   **Security:** No data leaves the browser. The system is fully functional offline.

---

## 5. Key Component Implementation

### 5.1. `services/tfService.ts`
The core engine. It encapsulates the logic for mapping high-level tactical concepts (e.g., "Rogue Access Point") into low-level tensor operations (e.g., pulsed signals at 2.412 GHz). It also contains the **Narrative Template Engine**, which procedurally generates the "Senior Analyst" text based on the objective mathematical findings of the tensor engine.

### 5.2. `DataVisualizer.tsx`
Remains the primary interface for verifying the physics engine's output. Because the data is now generated via rigorous math, the FFT view provides a true spectral decomposition of the generated signals, allowing for valid academic analysis of the simulated waveforms.