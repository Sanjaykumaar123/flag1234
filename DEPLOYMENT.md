# ContextForge AI — Deployment Guide

This guide details how to deploy the ContextForge AI platform:
- **Frontend**: Next.js App deployed to **Vercel**
- **Backend**: FastAPI Python Inference Server deployed to **Render**

---

## 🚀 Part 1: Deploying the Backend on Render

Render automatically detects the repository configuration using the included `render.yaml` file.

### Step 1: Connect your Repository to Render
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New** (top-right) and select **Blueprint**.
3. Connect your GitHub account and select your repository: `Sanjaykumaar123/flag1234`.
4. Render will read the `render.yaml` file automatically and configure a service named `contextforge-backend`.

### Step 2: Configure System Resources & Instance Type
* **Model Hardware Requirement**: Running large model backends like `Qwen3-4B` natively requires high memory/GPU resources.
* If deploying on Render's **Free Tier / Standard Tier**:
  - The server contains a CPU fallback using the `transformers` library.
  - Set the `MAX_NUM_BATCHED_TOKENS` environment variable to `2048` or `1024` to avoid out-of-memory errors on smaller hosts.
* To use high-performance vLLM:
  - Select an instance type with GPU support on Render.
  - Set `VLLM_PLUGINS=fl` and `MODEL_NAME=Qwen/Qwen3-4B`.

### Step 3: Launch Service
1. Click **Approve** on the Render Blueprint page.
2. Wait for the build and deployment to finish.
3. Copy your live Render service URL (e.g., `https://contextforge-backend.onrender.com`).

---

## ⚡ Part 2: Deploying the Frontend on Vercel

Vercel is optimized for Next.js and will handle the compilation automatically.

### Step 1: Set up the Vercel Project
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `Sanjaykumaar123/flag1234`.

### Step 2: Configure Environment Variables
In the **Environment Variables** section of the Vercel setup, add the following variables:

| Key | Value | Description |
|---|---|---|
| `LLM_BASE_URL` | `https://your-backend-url.onrender.com/v1/annotate` | Point to your Render URL (must end in `/v1/annotate`) |
| `LLM_MODEL` | `Qwen/Qwen3-4B` | Standard model identifier |
| `ICL_SHOTS` | `5` | Number of few-shot examples for in-context learning |
| `USE_COT` | `true` | Enable Chain-of-Thought reasoning |

### Step 3: Deploy
1. Click **Deploy**.
2. Once complete, Vercel will give you a public URL (e.g., `https://flag1234.vercel.app`).
