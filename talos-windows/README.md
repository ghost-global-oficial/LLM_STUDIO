# Talos LLM Studio

**Run AI models locally on Windows — no internet, no limits, total privacy.**

Talos LLM Studio is a desktop application for running language models, image generation, and more — entirely on your machine. Powered by a custom Go + llama.cpp inference engine with Ollama-compatible API.

---

## Features

- **Local AI Inference** — Run GGUF language models with CPU, Vulkan, or CUDA acceleration
- **Custom Engine** — High-performance Go + llama.cpp engine (`talos-engine`) with Ollama-compatible API on port 11435
- **Talos CLI** — Pure Go command-line interface for model management (`talos-cli`)
- **Ollama Support** — Connect to existing Ollama instances
- **Image Generation** — Stable Diffusion 1.5 via Python diffusers (CPU/GPU)
- **AirLLM Integration** — Low-memory inference for 70B+ models on limited VRAM
- **HuggingFace Browser** — Search and download models directly from HuggingFace
- **Multi-language UI** — English, Portuguese, Spanish, French, German, Chinese, Japanese, Korean, Russian, Arabic
- **OpenAI-Compatible API** — `/v1/chat/completions`, `/v1/models`, `/health`
- **File Attachments** — Attach images and files to chat
- **Guardrails** — Automatic model loading protection based on hardware
- **Encrypted Conversations** — Local encryption via Windows DPAPI

---

## Quick Start

1. Install from Microsoft Store or download the installer
2. Place GGUF models in the models directory (auto-detected on startup)
3. Select a model → click **Load** → start chatting

---

## Inference Backends

| Backend | Description |
|---------|-------------|
| **Talos Engine** | Custom Go + llama.cpp engine, fastest performance |
| **Talos CLI** | Pure Go CLI, communicates with engine via HTTP |
| **Ollama** | External Ollama server integration |

---

## Development

```bash
npm install
npm run dev        # Vite dev server + Electron
npm run build      # Build installers (APPX + NSIS)
npm run build:dir  # Build unpacked directory
```

---

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Electron + Express API
- **Engine**: Go + llama.cpp (CGo static build)
- **CLI**: Pure Go (no CGo)
- **Image Gen**: Python + diffusers
- **Payments**: Ghost Pay SDK

---

## Requirements

- Windows 10/11 x64
- 4GB+ RAM (8GB+ recommended)
- Python 3.11+ (for image generation and AirLLM)

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

## Acceptable Use Policy

This software is provided **exclusively** for personal, educational, and research purposes. The following uses are **strictly prohibited**:

- **Mass surveillance**: Using this software to monitor, track, or surveil individuals or groups at scale.
- **User data analysis**: Collecting, aggregating, or analyzing user interactions for profiling or decision-making.
- **Law enforcement or intelligence operations**: Deploying as part of any surveillance apparatus without explicit informed consent.
- **Workplace or educational surveillance**: Monitoring employees, students, or any individuals without their knowledge and explicit consent.

All models run **entirely locally** on the user's device. This software does not transmit, collect, or share any user data with external servers.

By using this software, you agree to respect the privacy and dignity of all individuals.
