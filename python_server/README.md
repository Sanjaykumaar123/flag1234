# ContextForge AI — vLLM Inference Server (FlagOS vllm-plugin-FL)
# Reference: https://github.com/flagos-ai/vllm-plugin-FL

## Overview

This microservice backs the ContextForge AI annotation pipeline with a
production-grade vLLM inference server built on the **FlagOS vllm-plugin-FL**
unified multi-chip backend.

### Architecture

```
Next.js Frontend
      │  POST /v1/chat/completions  (OpenAI-compatible)
      ▼
 FastAPI Server (app.py)
      │  vLLM engine
      ▼
 Qwen/Qwen3-4B
 (via vllm-plugin-FL + FlagGems operators)
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + backend info |
| GET | `/v1/models` | OpenAI-compatible model listing |
| POST | `/v1/chat/completions` | **Primary** — OpenAI-compatible chat |
| POST | `/annotate` | Legacy NER shim (backward compat) |

---

## Quick Start

### 1. Install vLLM (FlagOS spec)

```bash
# Install vLLM v0.20.2 as required by vllm-plugin-FL
pip install vllm==0.20.2

# OR install the FlagOS fork
pip install git+https://github.com/flagos-ai/vllm-FL.git
```

### 2. Install vllm-plugin-FL

```bash
git clone https://github.com/flagos-ai/vllm-plugin-FL
cd vllm-plugin-FL
pip install --no-build-isolation .
```

### 3. Install FlagGems (unified operator library)

```bash
pip install -U scikit-build-core==0.11 pybind11 ninja cmake
git clone https://github.com/flagos-ai/FlagGems
cd FlagGems
git checkout v5.0.0
pip install --no-build-isolation .
```

### 4. Install server dependencies

```bash
pip install -r requirements.txt
```

### 5. Start the server

```bash
cd python_server
python app.py
# or: uvicorn app:app --host 127.0.0.1 --port 8000
```

The server starts at **http://127.0.0.1:8000**.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_NAME` | `Qwen/Qwen3-4B` | HuggingFace model ID |
| `MAX_NUM_BATCHED_TOKENS` | `16384` | vLLM max batched tokens |
| `MAX_NUM_SEQS` | `2048` | vLLM max concurrent sequences |
| `ENFORCE_EAGER` | `0` | Set `1` for Ascend NPU |
| `VLLM_PLUGINS` | _(empty)_ | Set `fl` to activate vllm-plugin-FL |
| `USE_FLAGGEMS` | _(unset)_ | Set `0` to use native CUDA operators |
| `FLAGCX_PATH` | _(unset)_ | Path to FlagCX for unified comms |

### Ascend NPU

```bash
export TRITON_ALL_BLOCKS_PARALLEL=1
export ENFORCE_EAGER=1
export VLLM_PLUGINS=fl
python app.py
```

### Disable FlagGems (use native CUDA ops)

```bash
export USE_FLAGGEMS=0
python app.py
```

---

## Next.js Integration

Set in `.env.local`:

```env
LLM_API_KEY=local
LLM_BASE_URL=http://127.0.0.1:8000/v1/chat/completions
LLM_MODEL=Qwen/Qwen3-4B
```

The Next.js pipeline (`app/api/process/route.ts`) sends OpenAI-compatible
requests to this endpoint. If the server is unavailable, it falls back
automatically to the built-in heuristic NER engine.
