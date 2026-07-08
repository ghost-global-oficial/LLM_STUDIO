# Talos LLM Studio — Windows

Desktop application for running LLM models locally on Windows, powered by `node-llama-cpp` (llama.cpp).

## Quick Start

1. **Place GGUF models** in `%APPDATA%\talos-windows\models\` (or launch once to auto-create the folder)
2. **Run** `Talos LLM Studio.exe`
3. Select a model in the sidebar → click **Load**
4. Chat with the model or start the API server

## Features

- Chat interface with streaming responses
- OpenAI-compatible API server (`/v1/chat/completions`, `/v1/models`, `/health`)
- Automatic discovery of `.gguf` models
- CPU/GPU layer configuration
- Adjustable context size, temperature, max tokens
- API key authentication for server

## Development

```bash
cd talos-windows
npm install
npx vite        # starts Vite dev server + Electron
```

Build a portable EXE:

```bash
npm run build
```

Output in `release/Talos LLM Studio 1.0.0.exe`

## API Server

Start the server in the **Servidor** tab. Default:

```
http://localhost:1234/v1/chat/completions
```

Default API key: `talos-key-secret`

Set `Authorization: Bearer talos-key-secret` header to authenticate.

## Models

Place `.gguf` files in the models directory. The app scans for models recursively on launch and when "Refresh" is clicked.

## Requirements

- Windows 10/11 x64
- 4GB+ RAM (8GB+ recommended)
- ~2GB free disk for app + model storage

## Acceptable Use Policy

This software is provided **exclusively** for personal, educational, and research purposes. The following uses are **strictly prohibited**:

- **Mass surveillance**: Using this software to monitor, track, or surveil individuals or groups at scale, whether through direct observation, automated profiling, or any form of bulk data collection.
- **User data analysis**: Collecting, aggregating, or analyzing user interactions, conversations, or behavioral data for profiling, scoring, or decision-making purposes.
- **Law enforcement or intelligence operations**: Deploying this software as part of any surveillance apparatus, predictive policing system, or intelligence-gathering operation without the explicit informed consent of all affected individuals.
- **Workplace or educational surveillance**: Monitoring employees, students, or any individuals without their knowledge and explicit consent.

All models run **entirely locally** on the user's device. This software does not transmit, collect, or share any user data with external servers. Any modification that adds telemetry, data exfiltration, or remote monitoring capabilities is a violation of this policy and the spirit of the project.

By using this software, you agree to respect the privacy and dignity of all individuals.
