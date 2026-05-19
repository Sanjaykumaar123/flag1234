#!/usr/bin/env python
"""
ContextForge AI — vLLM smoke test
Mirrors the FlagOS vllm-plugin-FL offline_inference.py example.
Reference: https://github.com/flagos-ai/vllm-plugin-FL/blob/main/examples/offline_inference.py

Usage:
    python test_vllm.py
"""

import os
import sys

# ── FlagOS plugin environment setup ──────────────────────────────────────────
# Allow models with long max_model_len (needed for some Qwen3 variants)
os.environ.setdefault("VLLM_ALLOW_LONG_MAX_MODEL_LEN", "1")

# Activate the FL plugin when multiple vLLM plugins are installed
vllm_plugins = os.environ.get("VLLM_PLUGINS", "")
if vllm_plugins:
    print(f"[vllm-plugin-FL] Activating plugins: {vllm_plugins}")

try:
    import torch
    from vllm import LLM, SamplingParams
except ImportError as e:
    print(f"ERROR: vLLM not installed — {e}")
    print("Install: pip install vllm==0.20.2")
    sys.exit(1)

# ── Platform detection (FlagOS pattern) ──────────────────────────────────────
try:
    from vllm.platforms import current_platform
    print(f"[vllm-plugin-FL] Current platform : {current_platform}")
    print(f"[vllm-plugin-FL] Platform type    : {type(current_platform)}")
except ImportError:
    pass

if "USE_FLAGGEMS" in os.environ:
    print(f"[vllm-plugin-FL] USE_FLAGGEMS={os.environ['USE_FLAGGEMS']}")

# ── Model config ──────────────────────────────────────────────────────────────
MODEL_NAME = os.environ.get("MODEL_NAME", "Qwen/Qwen3-4B")
ENFORCE_EAGER = os.environ.get("ENFORCE_EAGER", "0") == "1"

print(f"\n[ContextForge] Loading model : {MODEL_NAME}")
print(f"[ContextForge] Enforce eager : {ENFORCE_EAGER}\n")

# ── NER prompt (matches ContextForge annotation task) ────────────────────────
SYSTEM_PROMPT = (
    "You are an expert NLP data annotation assistant for the FlagOS ContextForge platform. "
    "Extract Named Entities from the text below. "
    "Categories: Monetary, Percentage, Date, Measurement, Organization, Relation. "
    'Return ONLY valid JSON: {"entities": [{"name": "string", "type": "string"}]}'
)

TEST_TEXTS = [
    "OpenAI raised $6.6 billion in October 2024, achieving a $157 billion valuation.",
    "The patient's blood pressure was 140/90 mmHg after 200mg of medication.",
    "Acme Corp acquired Beta Industries in Q3 2023 for $2.4 billion.",
]

def build_prompt(text: str) -> str:
    return (
        f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n"
        f"<|im_start|>user\nText: \"{text}\"<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )

if __name__ == "__main__":
    # ── Load vLLM model ───────────────────────────────────────────────────────
    llm = LLM(
        model=MODEL_NAME,
        max_num_batched_tokens=16384,
        max_num_seqs=2048,
        enforce_eager=ENFORCE_EAGER,
    )

    sampling_params = SamplingParams(
        max_tokens=256,
        temperature=0.05,
        top_p=1.0,
    )

    prompts = [build_prompt(t) for t in TEST_TEXTS]

    print("=" * 60)
    print("Running ContextForge NER inference via vllm-plugin-FL...")
    print("=" * 60)

    outputs = llm.generate(prompts, sampling_params)

    for i, output in enumerate(outputs):
        print(f"\n[Chunk {i+1}] Input : {TEST_TEXTS[i]!r}")
        print(f"[Chunk {i+1}] Output: {output.outputs[0].text.strip()}")

    # ── Cleanup (mirrors FlagOS example) ─────────────────────────────────────
    del llm
    torch.cuda.empty_cache()
    print("\n✅ vLLM inference complete, resources cleared.")
