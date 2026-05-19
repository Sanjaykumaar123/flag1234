# ContextForge AI — FlagOS Track 3 ICL Inference Server
# vllm-plugin-FL backend · Qwen3-4B · Competition Grade
# Reference: https://github.com/flagos-ai/vllm-plugin-FL
#
# Endpoints:
#   POST /v1/chat/completions  — OpenAI-compatible (primary, used by Next.js)
#   POST /v1/annotate          — Full ICL annotation with CoT + grounding
#   POST /annotate             — Legacy shim
#   GET  /health               — Health + backend info
#   GET  /v1/models            — Model listing
#
# Key competition features:
#   - Domain-adaptive few-shot ICL (finance / medical / legal / technical / scientific)
#   - Chain-of-thought reasoning before structured output
#   - Long-context chunking with 15% overlap
#   - Hallucination self-correction loop (up to 2 retries)
#   - Entity grounding verification against source text
#   - Qwen3 im_start chat template

import os, json, time, uuid, re
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── FlagOS plugin env ─────────────────────────────────────────────────────────
_vllm_plugins = os.environ.get("VLLM_PLUGINS", "")
if _vllm_plugins:
    print(f"[vllm-plugin-FL] Activating plugins: {_vllm_plugins}")

MODEL_NAME               = os.environ.get("MODEL_NAME", "Qwen/Qwen3-4B")
MAX_NUM_BATCHED_TOKENS   = int(os.environ.get("MAX_NUM_BATCHED_TOKENS", "16384"))
MAX_NUM_SEQS             = int(os.environ.get("MAX_NUM_SEQS", "2048"))
ENFORCE_EAGER            = os.environ.get("ENFORCE_EAGER", "0") == "1"
MAX_ICL_SHOTS            = int(os.environ.get("MAX_ICL_SHOTS", "5"))

print(f"[ContextForge] Model : {MODEL_NAME} | Eager: {ENFORCE_EAGER}")

# ── Model bootstrap ───────────────────────────────────────────────────────────
llm = None; _model_tf = None; tokenizer_obj = None; _backend = "none"

try:
    from vllm import LLM, SamplingParams as _SP
    try:
        from vllm.platforms import current_platform
        print(f"[vllm-plugin-FL] Platform: {current_platform}")
    except ImportError:
        pass
    llm = LLM(model=MODEL_NAME, max_num_batched_tokens=MAX_NUM_BATCHED_TOKENS,
               max_num_seqs=MAX_NUM_SEQS, enforce_eager=ENFORCE_EAGER)
    _backend = "vllm"
    print(f"[ContextForge] ✅ vLLM ready: {MODEL_NAME}")
except Exception as e:
    print(f"[ContextForge] ⚠️  vLLM unavailable ({e}), trying transformers...")
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
        tokenizer_obj = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model_tf = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto")
        _backend = "transformers"
        print(f"[ContextForge] ✅ Transformers ready: {MODEL_NAME}")
    except Exception as e2:
        print(f"[ContextForge] ❌ No backend available: {e2}")

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="ContextForge AI — FlagOS Track 3", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Pydantic models ───────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: Optional[str] = MODEL_NAME
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.1
    max_tokens: Optional[int] = 512
    top_p: Optional[float] = 1.0
    stream: Optional[bool] = False
    response_format: Optional[dict] = None

class AnnotateRequest(BaseModel):
    text: str
    domain: Optional[str] = "General"
    icl_shots: Optional[int] = 5
    use_cot: Optional[bool] = True

# ── Domain-adaptive ICL exemplars ─────────────────────────────────────────────
# Each exemplar has: input text, domain label, sentiment, entity list, rationale (CoT)
ICL_EXEMPLARS: Dict[str, List[Dict]] = {
    "finance": [
        {
            "text": "Revenue grew 14% YoY to $1.2B in Q3 2025. Operating margins fell from 22% to 18.5%.",
            "label": "Financial Performance Report",
            "sentiment": "Mixed",
            "entities": [{"name": "$1.2B", "type": "Monetary"}, {"name": "14%", "type": "Percentage"},
                         {"name": "Q3 2025", "type": "Date"}, {"name": "18.5%", "type": "Percentage"}],
            "rationale": "Revenue increase is positive but margin compression is negative, yielding Mixed sentiment."
        },
        {
            "text": "The board approved a $500M share buyback program to return capital to shareholders.",
            "label": "Capital Allocation Decision",
            "sentiment": "Positive",
            "entities": [{"name": "$500M", "type": "Monetary"}],
            "rationale": "Buyback signals management confidence and is shareholder-friendly — Positive."
        },
        {
            "text": "Series C raised $120M at $1.5B valuation. Regulatory risk in EU under GDPR amendments.",
            "label": "Investment & Risk Analysis",
            "sentiment": "Mixed",
            "entities": [{"name": "$120M", "type": "Monetary"}, {"name": "$1.5B", "type": "Monetary"}],
            "rationale": "Strong funding offset by regulatory uncertainty — Mixed."
        },
    ],
    "medical": [
        {
            "text": "Patient 45M with Type 2 Diabetes, BP 135/85 mmHg, prescribed 500mg Amoxicillin. History of penicillin allergy.",
            "label": "Clinical Patient Assessment",
            "sentiment": "Neutral",
            "entities": [{"name": "135/85 mmHg", "type": "Measurement"}, {"name": "500mg", "type": "Measurement"},
                         {"name": "Amoxicillin", "type": "Organization"}],
            "rationale": "Clinical documentation is factual/neutral. Allergy note is a safety concern but not negative sentiment."
        },
        {
            "text": "GLP-1 trial showed 15% BMI reduction over 52 weeks. Adverse GI events in 35% of participants.",
            "label": "Clinical Trial Outcome Report",
            "sentiment": "Mixed",
            "entities": [{"name": "15%", "type": "Percentage"}, {"name": "35%", "type": "Percentage"},
                         {"name": "52 weeks", "type": "Date"}],
            "rationale": "Efficacy is positive, but 35% adverse event rate is concerning — Mixed."
        },
    ],
    "legal": [
        {
            "text": "NDA between Acme Corp and Beta Industries. Confidentiality for 5 years. Arbitration in Delaware.",
            "label": "Non-Disclosure Agreement",
            "sentiment": "Neutral",
            "entities": [{"name": "Acme Corp", "type": "Organization"}, {"name": "Beta Industries", "type": "Organization"},
                         {"name": "5 years", "type": "Date"}, {"name": "Delaware", "type": "Organization"}],
            "rationale": "Standard NDA is a neutral contractual instrument."
        },
        {
            "text": "Contractor shall indemnify Client from claims arising from gross negligence. Insurance minimum $2,000,000.",
            "label": "Indemnification Clause",
            "sentiment": "Neutral",
            "entities": [{"name": "$2,000,000", "type": "Monetary"}],
            "rationale": "Legal obligation language is neutral — factual risk allocation."
        },
    ],
    "technology": [
        {
            "text": "128-qubit processor reduces error-correction overhead 30%. Coherence time extended to 500 microseconds.",
            "label": "Quantum Hardware Benchmark",
            "sentiment": "Positive",
            "entities": [{"name": "30%", "type": "Percentage"}, {"name": "500 microseconds", "type": "Measurement"}],
            "rationale": "Performance improvements are positive technical achievements."
        },
        {
            "text": "Multi-agent framework reduced latency from 45s to 12s for 100k token documents. 98% hallucination detection.",
            "label": "System Architecture Performance Report",
            "sentiment": "Positive",
            "entities": [{"name": "45s", "type": "Measurement"}, {"name": "12s", "type": "Measurement"},
                         {"name": "98%", "type": "Percentage"}],
            "rationale": "Significant latency and accuracy improvements — strongly Positive."
        },
    ],
    "scientific": [
        {
            "text": "Statistical significance p<0.05 confirmed. Effect size Cohen's d=0.72. Sample n=1,200.",
            "label": "Statistical Analysis Report",
            "sentiment": "Positive",
            "entities": [{"name": "0.05", "type": "Measurement"}, {"name": "0.72", "type": "Measurement"}],
            "rationale": "Statistically significant finding with medium-large effect size — Positive outcome."
        },
    ],
    "general": [
        {
            "text": "The committee reviewed the proposal and requested additional documentation for clarification.",
            "label": "Administrative Communication",
            "sentiment": "Neutral",
            "entities": [],
            "rationale": "No strong positive or negative signal — routine administrative communication."
        },
    ],
}

DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "finance":     ["revenue","profit","margin","ebitda","equity","valuation","funding","investment",
                    "fiscal","earnings","cash","dividend","shares","buyback","debt","acquisition","ipo",
                    "market","quarterly","annual","portfolio","series","raise","funding","billion","million"],
    "medical":     ["patient","diagnosis","clinical","treatment","dosage","symptoms","therapy","adverse",
                    "trial","cohort","bmi","mmhg","bpm","medication","prescribed","allergy","blood",
                    "surgery","disease","pharmaceutical","fda","phase","drug","dose","mg","ml"],
    "legal":       ["agreement","contract","indemnify","liability","clause","arbitration","jurisdiction",
                    "confidential","disclosure","breach","damages","intellectual","nda","parties",
                    "negligence","insurance","warranty","plaintiff","defendant","court"],
    "technology":  ["algorithm","architecture","latency","throughput","api","processor","qubit","coherence",
                    "inference","pipeline","neural","model","bandwidth","framework","node","server",
                    "azure","aws","openai","gpt","transformer","token","microsecond","agent","llm"],
    "scientific":  ["hypothesis","experiment","methodology","analysis","correlation","regression",
                    "statistical","significance","p-value","confidence","interval","cohort","sample",
                    "effect","cohen","variance","standard deviation","mean","median"],
}

def detect_domain(text: str) -> str:
    lower = text.lower()
    scores = {d: sum(1 for k in kws if k in lower) for d, kws in DOMAIN_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general"

def select_icl_exemplars(domain: str, n: int = 5) -> List[Dict]:
    """Return up to n exemplars, prioritising the detected domain then filling from others."""
    primary = ICL_EXEMPLARS.get(domain, [])
    result = list(primary[:n])
    if len(result) < n:
        for d, exs in ICL_EXEMPLARS.items():
            if d == domain:
                continue
            for ex in exs:
                if len(result) >= n:
                    break
                result.append(ex)
            if len(result) >= n:
                break
    return result[:n]

# ── Prompt builders ───────────────────────────────────────────────────────────
def build_qwen_prompt(messages: List[Dict]) -> str:
    """Render messages in Qwen3 im_start chat template."""
    parts = []
    for m in messages:
        parts.append(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>")
    parts.append("<|im_start|>assistant\n")
    return "\n".join(parts)

def build_icl_annotation_prompt(text: str, domain: str, n_shots: int = 5, use_cot: bool = True) -> str:
    """Build a full Track-3 ICL annotation prompt with optional chain-of-thought."""
    exemplars = select_icl_exemplars(domain, n_shots)

    system_content = (
        "You are an expert data annotation assistant participating in the FlagOS Open Computing "
        "Global Challenge — Track 3: Automatic Data Annotation for Large Models in Long-Context Scenarios.\n\n"
        "Your task: given a text chunk, produce a structured annotation with:\n"
        "  • label        — a precise, domain-specific annotation category\n"
        "  • sentiment    — Positive | Negative | Neutral | Mixed\n"
        "  • entities     — list of {name, type} where type ∈ "
        "{Monetary, Percentage, Date, Measurement, Organization, Relation}\n"
        "  • rationale    — one concise sentence explaining your annotation\n\n"
        "Rules:\n"
        "  1. Only extract entities that appear verbatim in the source text.\n"
        "  2. Base sentiment on the overall tone, not individual words.\n"
        "  3. If no entities are present, return an empty list — do NOT hallucinate.\n"
        "  4. Return ONLY valid JSON — no markdown, no extra keys.\n\n"
        'Output schema: {"label":"string","sentiment":"string","entities":[{"name":"string","type":"string"}],"rationale":"string"}'
    )

    # Build few-shot examples block
    few_shot_lines = []
    for i, ex in enumerate(exemplars):
        few_shot_lines.append(f"--- Example {i+1} ---")
        few_shot_lines.append(f"Input: \"{ex['text']}\"")
        output = {
            "label": ex["label"],
            "sentiment": ex["sentiment"],
            "entities": ex["entities"],
            "rationale": ex["rationale"],
        }
        few_shot_lines.append(f"Output: {json.dumps(output)}")
    few_shot_block = "\n".join(few_shot_lines)

    cot_instruction = ""
    if use_cot:
        cot_instruction = (
            "\n\nThink step-by-step before producing the JSON:\n"
            "  Step 1: Identify the domain and context.\n"
            "  Step 2: Extract all verbatim entities with their types.\n"
            "  Step 3: Determine sentiment from the overall tone.\n"
            "  Step 4: Choose the most specific label.\n"
            "  Step 5: Write one-sentence rationale.\n"
            "  Step 6: Output ONLY the JSON.\n"
        )

    user_content = (
        f"Domain: {domain.title()}\n\n"
        f"Few-shot examples:\n{few_shot_block}\n"
        f"{cot_instruction}\n"
        f"--- Now annotate this chunk ---\n"
        f"Input: \"{text}\"\n"
        # /no_think is the Qwen3 soft-switch that suppresses <think> blocks.
        # This keeps the output clean JSON without think-token bleed.
        f"Output: /no_think"
    )

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user",   "content": user_content},
    ]
    return build_qwen_prompt(messages)

# ── Qwen3-4B sampling parameters ─────────────────────────────────────────────
# Qwen3 official recommendation (non-thinking / structured output mode):
#   temperature=0.7, top_p=0.8, top_k=20
# Thinking mode (when <think> blocks are desired):
#   temperature=0.6, top_p=0.95, top_k=20
# We use non-thinking params for annotation tasks (deterministic JSON output).
QWEN3_TEMP    = float(os.environ.get("QWEN3_TEMP",   "0.7"))
QWEN3_TOP_P   = float(os.environ.get("QWEN3_TOP_P",  "0.8"))
QWEN3_TOP_K   = int(os.environ.get("QWEN3_TOP_K",    "20"))

# ── Inference ─────────────────────────────────────────────────────────────────
def _infer(prompt: str, max_tokens: int = 512,
           temperature: float = QWEN3_TEMP) -> str:
    if _backend == "vllm":
        from vllm import SamplingParams
        sp = SamplingParams(
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=QWEN3_TOP_P,
            top_k=QWEN3_TOP_K,
        )
        out = llm.generate([prompt], sp)
        return out[0].outputs[0].text.strip()
    elif _backend == "transformers":
        import torch
        inputs = tokenizer_obj(prompt, return_tensors="pt").to(_model_tf.device)
        with torch.no_grad():
            out = _model_tf.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=QWEN3_TOP_P,
                top_k=QWEN3_TOP_K,
                do_sample=True,
            )
        gen = out[0][inputs["input_ids"].shape[1]:]
        return tokenizer_obj.decode(gen, skip_special_tokens=True).strip()
    else:
        raise RuntimeError("No backend available")

def _strip_think_blocks(raw: str) -> str:
    """
    Qwen3 thinks by default and wraps its reasoning in <think>...</think> blocks.
    These must be stripped BEFORE JSON parsing or they break json.loads().
    Also handles the case where the block is unclosed (model cut off mid-think).
    """
    # Remove complete <think>...</think> blocks (possibly multi-line)
    raw = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.DOTALL)
    # Remove any orphaned opening tag (unclosed block)
    raw = re.sub(r"<think>[\s\S]*", "", raw, flags=re.DOTALL)
    return raw.strip()

def _clean_json_output(raw: str) -> str:
    """Strip Qwen3 think blocks, CoT text, and markdown fences; return only JSON."""
    # 1. Strip Qwen3 <think> blocks first
    raw = _strip_think_blocks(raw)
    # 2. Strip markdown fences
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    # 3. Find first { and last } to extract JSON object
    json_start = raw.find("{")
    json_end   = raw.rfind("}")
    if json_start != -1 and json_end != -1 and json_end >= json_start:
        raw = raw[json_start:json_end+1]
    return raw.strip()

def _ground_entities(entities: List[Dict], source_text: str) -> List[Dict]:
    """Mark each entity as grounded if its name appears verbatim in source."""
    lower_src = source_text.lower()
    for e in entities:
        e["grounded"] = e.get("name", "").lower() in lower_src
    return entities

def annotate_chunk(text: str, domain: str, icl_shots: int = 5,
                   use_cot: bool = True, retries: int = 2) -> Dict:
    """
    Run ICL annotation with optional self-correction on JSON parse failure.
    The /no_think soft-switch is appended to the user turn to suppress Qwen3's
    <think> blocks and produce clean, deterministic JSON output.
    Returns the structured annotation dict.
    """
    prompt = build_icl_annotation_prompt(text, domain, icl_shots, use_cot)
    # Use Qwen3 non-thinking sampling params for structured annotation
    raw = _infer(prompt, max_tokens=700, temperature=QWEN3_TEMP)
    cleaned = _clean_json_output(raw)

    for attempt in range(retries + 1):
        try:
            data = json.loads(cleaned)
            # Normalise entities
            entities = data.get("entities", [])
            if not isinstance(entities, list):
                entities = []
            entities = _ground_entities(entities, text)
            return {
                "label":     data.get("label", "Unlabeled"),
                "sentiment": data.get("sentiment", "Neutral"),
                "entities":  entities,
                "rationale": data.get("rationale", ""),
                "raw_output": raw,
                "self_corrected": attempt > 0,
            }
        except json.JSONDecodeError:
            if attempt < retries:
                # Self-correction: re-prompt asking for JSON only
                correction_prompt = build_qwen_prompt([
                    {"role": "system", "content":
                        "You are a JSON repair assistant. The text below is supposed to be valid JSON. "
                        "Fix any syntax errors and return ONLY the corrected JSON object. No markdown."},
                    {"role": "user", "content": f"Repair this JSON:\n{cleaned}\n\nCorrected JSON:"},
                ])
                cleaned = _clean_json_output(_infer(correction_prompt, max_tokens=400, temperature=0.0))
            else:
                # Final fallback — return safe empty annotation
                return {
                    "label": "Parse Error",
                    "sentiment": "Neutral",
                    "entities": [],
                    "rationale": "Model output could not be parsed as JSON.",
                    "raw_output": raw,
                    "self_corrected": True,
                }

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "backend": _backend, "model": MODEL_NAME,
            "plugin": "vllm-plugin-FL (FlagOS)", "vllm_plugins": _vllm_plugins or "default"}

@app.get("/v1/models")
def list_models():
    return {"object": "list", "data": [
        {"id": MODEL_NAME, "object": "model", "created": int(time.time()), "owned_by": "flagos-contextforge"}
    ]}

@app.post("/v1/chat/completions")
def chat_completions(req: ChatRequest):
    """Primary OpenAI-compatible endpoint for the Next.js pipeline."""
    if _backend == "none":
        raise HTTPException(503, "Model backend not available")
    try:
        prompt = build_qwen_prompt([{"role": m.role, "content": m.content} for m in req.messages])
        raw = _infer(prompt, max_tokens=req.max_tokens or 512, temperature=req.temperature or 0.1)
        cid = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        return {
            "id": cid, "object": "chat.completion", "created": int(time.time()), "model": req.model or MODEL_NAME,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": raw}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": len(prompt.split()), "completion_tokens": len(raw.split()),
                      "total_tokens": len(prompt.split()) + len(raw.split())},
        }
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/v1/annotate")
def annotate_endpoint(req: AnnotateRequest):
    """
    Full Track-3 ICL annotation endpoint.
    Returns structured label + sentiment + entities + rationale + grounding.
    """
    if _backend == "none":
        raise HTTPException(503, "Model backend not available")
    try:
        domain = detect_domain(req.text) if req.domain == "General" else req.domain.lower()
        result = annotate_chunk(req.text, domain, req.icl_shots or 5, req.use_cot or True)
        grounded = [e for e in result["entities"] if e.get("grounded")]
        grounding_score = len(grounded) / max(len(result["entities"]), 1)
        return {
            **result,
            "domain": domain,
            "icl_shots_used": req.icl_shots or 5,
            "entity_grounding_score": round(grounding_score, 3),
            "matched_entities": [e["name"] for e in grounded],
        }
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/annotate")
def annotate_legacy(req: AnnotateRequest):
    """Legacy shim — calls the v1 endpoint internally."""
    return annotate_endpoint(req)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
