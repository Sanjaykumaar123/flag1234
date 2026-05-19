from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from vllm import LLM, SamplingParams
import json

app = FastAPI(title="ContextForge Qwen3-4B API (vLLM Engine)")

# Model configuration
# Note: Swap this to "Qwen/Qwen3-4B-Instruct" when the weights are available.
MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct" 

print(f"Loading {MODEL_NAME} using vLLM for ultra-fast inference...")
try:
    llm = LLM(
        model=MODEL_NAME, 
        trust_remote_code=True,
        tensor_parallel_size=1, # Change this if using multiple GPUs
        gpu_memory_utilization=0.9
    )
    print("vLLM Engine loaded successfully!")
except Exception as e:
    print(f"Error loading model (Check GPU / Dependencies): {e}")
    llm = None

class ChunkRequest(BaseModel):
    text: str
    domain: str

@app.post("/annotate")
async def annotate_chunk(req: ChunkRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="vLLM Engine not loaded. Check GPU.")

    # Adaptive Few-Shot In-Context Learning (ICL) Prompt
    prompt = f"""
<|im_start|>system
You are an expert NLP data annotation assistant.
Your task is to analyze the text and extract named entities, sentiment, and the specific label.
Return ONLY valid JSON matching this exact schema:
{{
  "entities": [
    {{"name": "string", "type": "Monetary|Percentage|Date|Measurement|Organization|Relation"}}
  ]
}}
<|im_end|>
<|im_start|>user
Text: "{req.text}"
<|im_end|>
<|im_start|>assistant
"""
    try:
        sampling_params = SamplingParams(
            temperature=0.1,
            max_tokens=150,
            stop=["<|im_end|>"]
        )
        
        outputs = llm.generate([prompt], sampling_params)
        response = outputs[0].outputs[0].text
        
        # Clean up markdown JSON formatting if present
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            response = response.replace("```", "").strip()

        # Validate it's parseable JSON
        json_data = json.loads(response)
        
        return json_data
        
    except Exception as e:
        print(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
