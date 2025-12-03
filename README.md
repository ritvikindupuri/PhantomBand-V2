# PhantomBand V2: Deterministic RF Threat Simulation

**PhantomBand** is a secure, air-gapped, client-side platform for Electronic Warfare (EW) training and Signals Intelligence (SIGINT) analysis.

### The Engine: PB-DSP-v1

Instead of a traditional AI wrapper, we built **PB-DSP-v1 (PhantomBand Digital Signal Processing)**.

*   **How is it trained?** It isn't trained on a dataset. It is **Calibrated via Domain Knowledge Injection**.
*   We hard-coded **Maxwell’s Equations**, the **Friis Transmission Equation**, and **ITU-R International Noise Standards** directly into the TensorFlow graph.
*   **Why is this better?** A neural network offers a *probability* of what a signal looks like. Our engine offers a *calculation*. It is **deterministic**. It cannot hallucinate a signal that violates the laws of physics.

---

##  Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
*   **Node.js**: Version 18.0.0 or higher
*   **Package Manager**: npm (v9+) or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/organization/phantom-band.git
    cd phantom-band
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start Development Server**
    ```bash
    npm run dev
    ```
    The application will launch automatically at `http://localhost:5173`.

### Building for Production

To create a production-ready build (outputs to `/dist`):

```bash
npm run build
```

---

##  Technology Stack

PhantomBand is built on a modern, type-safe stack designed for high-performance client-side computation.

*   **Core Physics Engine**: [TensorFlow.js](https://www.tensorflow.org/js) (WebGL-accelerated DSP)
*   **Frontend Framework**: [React 18](https://react.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Visualization**: [Recharts](https://recharts.org/) (D3-based wrappers)

---

## 📚 Documentation Structure

To keep information organized, documentation is split into two levels:

1.  **README (This File)**: 
    *   Focuses on **Deployment**, **Installation**, and **High-Level Usage**.
    *   Intended for developers setting up the environment.

2.  **[Technical Documentation (TECHNICAL_DOCUMENTATION.md)](./TECHNICAL_DOCUMENTATION.md)**: 
    *   Focuses on **Physics Models**, **Architecture**, and **Math**.
    *   Details the **PB-DSP-v1 Model** (Maxwell's Equations, Friis Transmission, ITU-R Standards).
    *   Explains the 3-Sigma Anomaly Detection algorithm.
    *   Intended for EW analysts and core engine contributors.

---

##  Security & Privacy

*   **Air-Gapped by Design**: All computations occur locally in the user's browser via WebGL.
*   **Zero Data Exfiltration**: Uploaded CSV/TXT logs for analysis are parsed in memory and never transmitted to any external server.

---

## Author

Created by **Ritvik Indupuri** - Cybersecurity Student at Purdue University.

---

## License

MIT License - For educational and defensive simulation purposes only.
