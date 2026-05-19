"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Award, BrainCircuit, ChevronLeft, Database, FileText, Network, Settings, Sparkles, Upload, Sliders, Shield, Cpu, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import { GlowOrbs, StatCard, AgentCard, AnnotationHeatmap, AnnotationPreview, ICLInspector, QualityChart, AnnotationLineage } from "@/components/StudioUI";

type Phase = "idle"|"dataset_loaded"|"annotating"|"validating"|"complete";

const AGENTS = [
  { id:"ingestion", name:"Data Ingestion",     color:"gray",    glow:"rgba(156,163,175,0.4)" },
  { id:"analyst",   name:"ICL Prompt Builder", color:"blue",    glow:"rgba(59,130,246,0.4)"  },
  { id:"generator", name:"Qwen3-4B Inference", color:"violet",  glow:"rgba(139,92,246,0.4)"  },
  { id:"verifier",  name:"Fact Verifier",      color:"emerald", glow:"rgba(16,185,129,0.4)"  },
  { id:"scorer",    name:"Confidence Scorer",  color:"yellow",  glow:"rgba(234,179,8,0.4)"   },
];

const PHASE_STEPS = [
  { key:"dataset_loaded", label:"Load Unified Dataset",      icon:<Database className="w-3.5 h-3.5"/>   },
  { key:"annotating",     label:"ICL Annotation (Qwen3-4B)", icon:<BrainCircuit className="w-3.5 h-3.5"/>},
  { key:"validating",     label:"Evaluate on Eval Dataset",  icon:<Activity className="w-3.5 h-3.5"/>    },
  { key:"complete",       label:"Leaderboard Export",         icon:<Award className="w-3.5 h-3.5"/>      },
];

const PHASE_ORDER = ["idle","dataset_loaded","annotating","validating","complete"];

export default function StudioPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pipelineState, setPipelineState] = useState("");
  const [logs, setLogs] = useState<{time:string, message:string}[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [stats, setStats] = useState({ chunks:0, hallucinations:0, confidence:"—", f1:"—", precision:"—", recall:"—" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [iclShots, setIclShots] = useState(5);
  const [chunkSize, setChunkSize] = useState(300);
  const [selfHeal, setSelfHeal] = useState(true);
  const [hallucCheck, setHallucCheck] = useState(true);
  const unifiedRef = useRef<HTMLInputElement>(null);
  const evalRef    = useRef<HTMLInputElement>(null);

  const addLog = (msg:string) => setLogs(p => [{ time: new Date().toLocaleTimeString(), message: msg }, ...p]);

  const runPipeline = async (file:File, mode:"unified"|"evaluation") => {
    setIsProcessing(true); setLogs([]); setChartData([]); setAnnotations([]);
    setStats({ chunks:0, hallucinations:0, confidence:"—", f1:"—", precision:"—", recall:"—" });
    setPipelineState("ingestion"); setCurrentFile(file.name);
    setPhase(mode === "unified" ? "annotating" : "validating");
    const fd = new FormData(); fd.append("file", file); fd.append("mode", mode);
    try {
      const res = await fetch("/api/process", { method:"POST", body:fd });
      if (!res.body) return;
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = dec.decode(value, { stream:true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.replace("data: ",""));
            if (p.step === "complete") { setPipelineState("complete"); setPhase("complete"); setIsProcessing(false); }
            else {
              setPipelineState(p.step);
              if (p.statsUpdate)      setStats(prev => ({ ...prev, ...p.statsUpdate }));
              if (p.chartUpdate)      setChartData(p.chartUpdate);
              if (p.annotationUpdate) setAnnotations(p.annotationUpdate);
              if (p.log)              addLog(p.log);
            }
          } catch {}
        }
      }
    } catch { setIsProcessing(false); }
  };

  const exportSubmission = () => {
    if (!annotations.length) return;
    // Competition JSONL format (one JSON object per line)
    const lines = annotations.map((a: any) => JSON.stringify({
      id:                  a.chunk,
      label:               a.label,
      sentiment:           a.sentiment,
      rationale:           a.rationale || "",
      confidence:          Number(a.confidence).toFixed(4),
      hallucination_risk:  a.hallucination_risk,
      entities:            a.entities || [],
      matched_entities:    a.matched_entities || [],
      entity_grounding:    Number(a.entity_grounding_score).toFixed(3),
      icl_shots:           a.icl_shots || 5,
      self_corrected:      a.self_corrected || false,
      verifier_status:     a.verifier_status,
      domain:              a.domain,
      f1_proxy:            (Number(a.confidence) * 100).toFixed(1) + "%",
    }));
    const blob = new Blob([lines.join("\n")], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contextforge_submission.jsonl";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const currentPhaseIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:"#0f1118" }}>
      <GlowOrbs />

      {/* ── SIDEBAR ──────────────────────────────── */}
      <aside className="w-60 border-r border-white/[0.06] flex flex-col z-10 relative" style={{ background:"rgba(255,255,255,0.02)" }}>
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
            <span className="font-bold text-white flex items-center gap-1.5">
              ContextForge <Sparkles className="w-3 h-3 text-violet-400" />
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1 uppercase tracking-[0.15em]">Track 3 Workflow</p>
          {PHASE_STEPS.map((s,i) => {
            const sIdx = PHASE_ORDER.indexOf(s.key);
            const done = currentPhaseIdx > sIdx;
            const active = phase === s.key;
            return (
              <motion.div key={i} animate={{ opacity: sIdx <= currentPhaseIdx + 1 ? 1 : 0.4 }}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active ? "bg-violet-500/15 text-violet-300 border border-violet-500/20" :
                  done ? "text-emerald-400" : "text-muted-foreground"
                }`}>
                {done ? <span className="text-emerald-400">✓</span> : s.icon}
                {s.label}
                {active && isProcessing && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
              </motion.div>
            );
          })}

          <div className="pt-4 border-t border-white/[0.06] mt-2">
            <p className="text-[10px] text-muted-foreground px-3 py-1 uppercase tracking-[0.15em]">ICL Config</p>
            <div className="px-3 py-2 space-y-1.5 font-mono text-[11px]">
              {[["Model","Qwen3-4B","text-violet-400"],["Few-shot","5 examples","text-blue-400"],["Strategy","Adaptive ICL","text-emerald-400"],["Chunking","300w + 15% overlap","text-yellow-400"]].map(([k,v,c])=>(
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className={c}>{v}</span></div>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={()=>setShowSettings(s=>!s)}
            className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg transition-all ${ showSettings ? "bg-violet-500/15 text-violet-300" : "text-muted-foreground hover:text-white hover:bg-white/5" }`}>
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      </aside>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.aside initial={{width:0,opacity:0}} animate={{width:260,opacity:1}} exit={{width:0,opacity:0}}
            transition={{duration:0.3,ease:"easeInOut"}}
            className="border-r border-white/[0.06] overflow-hidden flex-shrink-0 z-10 relative"
            style={{background:"rgba(255,255,255,0.02)"}}>
            <div className="w-[260px] p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sliders className="w-4 h-4 text-violet-400"/>Pipeline Settings</h3>
                <button onClick={()=>setShowSettings(false)} className="text-muted-foreground hover:text-white text-xs">✕</button>
              </div>

              {/* Few-shot count */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-blue-400"/>Few-shot Examples</span>
                  <span className="text-blue-400 font-mono font-bold">{iclShots}</span>
                </label>
                <input type="range" min={1} max={10} value={iclShots} onChange={e=>setIclShots(+e.target.value)}
                  className="w-full accent-violet-500 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1</span><span>10</span></div>
              </div>

              {/* Chunk size */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-400"/>Chunk Size (words)</span>
                  <span className="text-emerald-400 font-mono font-bold">{chunkSize}</span>
                </label>
                <input type="range" min={100} max={500} step={50} value={chunkSize} onChange={e=>setChunkSize(+e.target.value)}
                  className="w-full accent-violet-500 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>100</span><span>500</span></div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Features</p>
                {[{label:"Self-Healing Pipeline",icon:<Shield className="w-3.5 h-3.5 text-emerald-400"/>,val:selfHeal,set:setSelfHeal},
                  {label:"Hallucination Check",icon:<Shield className="w-3.5 h-3.5 text-red-400"/>,val:hallucCheck,set:setHallucCheck}]
                .map((t,i)=>(
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">{t.icon}{t.label}</span>
                    <button onClick={()=>t.set((v:boolean)=>!v)}>
                      {t.val ? <ToggleRight className="w-5 h-5 text-violet-400"/> : <ToggleLeft className="w-5 h-5 text-muted-foreground"/>}
                    </button>
                  </div>
                ))}
              </div>

              {/* Model info */}
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2 text-[11px] font-mono">
                <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Active Model</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="text-violet-400">Qwen3-4B</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Strategy</span><span className="text-blue-400">Adaptive ICL</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Overlap</span><span className="text-emerald-400">15%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Few-shot</span><span className="text-yellow-400">{iclShots} examples</span></div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN ────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">

        {/* Header */}
        <header className="px-6 py-4 border-b border-white/[0.06] sticky top-0 z-20" style={{background:"rgba(5,5,8,0.85)",backdropFilter:"blur(20px)"}}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Track 3 — Annotation Studio
                {isProcessing && <motion.span animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:1.5 }} className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-normal">LIVE</motion.span>}
              </h1>
              <p className="text-xs text-muted-foreground">FlagOS ICL Pipeline · Qwen3-4B · {iclShots}-shot {selfHeal ? "+ CoT" : ""} · {currentFile || "No dataset loaded"}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${isProcessing?"bg-yellow-500/10 border-yellow-500/20 text-yellow-400":"bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isProcessing?"bg-yellow-400 animate-pulse":"bg-emerald-400"}`} />
                {isProcessing ? "Processing..." : "Engine Ready"}
              </div>
              <input ref={unifiedRef} type="file" className="hidden" accept=".txt,.pdf,.csv,.json,.jsonl" onChange={e=>e.target.files?.[0]&&runPipeline(e.target.files[0],"unified")} />
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>unifiedRef.current?.click()} disabled={isProcessing}
                className="btn-gold text-sm disabled:opacity-50 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Load Unified Dataset
              </motion.button>
              <input ref={evalRef} type="file" className="hidden" accept=".txt,.pdf,.csv,.json,.jsonl" onChange={e=>e.target.files?.[0]&&runPipeline(e.target.files[0],"evaluation")} />
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>evalRef.current?.click()} disabled={isProcessing}
                className="btn-outline text-sm disabled:opacity-50 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Validate on Eval Set
              </motion.button>
              {phase==="complete" && (
                <motion.button initial={{scale:0}} animate={{scale:1}} whileHover={{scale:1.05}} onClick={exportSubmission}
                  className="px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all">
                  <Award className="w-4 h-4" /> Export JSONL
                </motion.button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {phase !== "idle" && (
            <div className="mt-3 flex items-center gap-1">
              {PHASE_STEPS.map((s,i) => {
                const sIdx = PHASE_ORDER.indexOf(s.key);
                const done = currentPhaseIdx >= sIdx;
                return (
                  <div key={i} className="flex-1">
                    <div className="relative h-1 rounded-full overflow-hidden bg-white/5">
                      {done && <motion.div initial={{width:0}} animate={{width:"100%"}} className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-blue-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </header>

        <div className="p-6 space-y-5">

          {/* IDLE */}
          <AnimatePresence>
            {phase==="idle" && (
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
                className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                <motion.div animate={{y:[0,-8,0]}} transition={{repeat:Infinity,duration:3}} className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Network className="w-10 h-10 text-violet-400" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Ready for Track 3</h2>
                  <p className="text-muted-foreground max-w-md">Load the official FlagOS unified dataset to begin ICL annotation using Qwen3-4B. All metrics are computed in real-time.</p>
                </div>
                <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.97}} onClick={()=>unifiedRef.current?.click()}
                  className="btn-gold flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Load Unified Dataset
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STATS */}
          {phase!=="idle" && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <StatCard label="Chunks" value={stats.chunks.toString()} color="text-white" delay={0} />
              <StatCard label="Hallucinations" value={stats.hallucinations.toString()} color="text-red-400" delay={0.05} />
              <StatCard label="Confidence" value={stats.confidence} color="text-emerald-400" delay={0.1} />
              <StatCard label="F1 Score" value={stats.f1} color="text-violet-400" delay={0.15} />
              <StatCard label="Precision" value={stats.precision} color="text-blue-400" delay={0.2} />
              <StatCard label="Recall" value={stats.recall} color="text-yellow-400" delay={0.25} />
            </div>
          )}

          {/* AGENTS + CHART */}
          {phase!=="idle" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="glass-panel p-5 rounded-2xl border border-white/[0.06] space-y-2.5">
                <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <Network className="w-4 h-4 text-violet-400" /> Agent Pipeline
                </h3>
                {AGENTS.map((agent,i) => {
                  const activeIdx = AGENTS.findIndex(a=>a.id===pipelineState);
                  const isActive = pipelineState===agent.id;
                  const isDone = (pipelineState==="complete") || activeIdx > i;
                  return <AgentCard key={i} agent={agent} isActive={isActive} isDone={isDone} />;
                })}
              </div>
              <div className="lg:col-span-2">
                <QualityChart data={chartData} />
              </div>
            </div>
          )}

          {/* HEATMAP */}
          {phase!=="idle" && annotations.length > 0 && <AnnotationHeatmap annotations={annotations} />}

          {/* PREVIEW + ICL + LINEAGE */}
          {phase!=="idle" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <ICLInspector annotations={annotations} />
              <AnnotationPreview annotations={annotations} />
              <AnnotationLineage annotations={annotations} />
            </div>
          )}

          {/* LOGS */}
          {phase!=="idle" && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-panel p-5 rounded-2xl border border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Pipeline Logs
                <span className="ml-auto text-[10px] text-muted-foreground">{logs.length} entries</span>
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                {!logs.length && <p className="text-muted-foreground text-center py-4">Waiting for pipeline...</p>}
                <AnimatePresence>
                  {logs.slice(0,20).map((l,i) => (
                    <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                      className="flex gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-muted-foreground shrink-0">{l.time}</span>
                      <span className="text-white/80">{l.message}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* LEADERBOARD RESULT */}
          {phase==="complete" && (
            <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}
              className="rounded-2xl border border-emerald-500/20 p-6 relative overflow-hidden"
              style={{background:"linear-gradient(135deg,rgba(16,185,129,0.05),rgba(59,130,246,0.05))"}}>
              <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at top right, rgba(16,185,129,0.08), transparent 60%)"}} />
              <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" /> Leaderboard Evaluation Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[["F1 Score",stats.f1,"text-emerald-400"],["Precision",stats.precision,"text-blue-400"],["Recall",stats.recall,"text-violet-400"],["Confidence",stats.confidence,"text-yellow-400"]].map(([l,v,c])=>(
                  <motion.div key={l} whileHover={{scale:1.03}} className="glass-panel rounded-xl p-4 text-center border border-white/[0.06]">
                    <p className="text-[11px] text-muted-foreground mb-1">{l}</p>
                    <p className={`text-2xl font-bold font-mono ${c}`}>{v}</p>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span className="text-emerald-400">✓</span>
                <span>File: <strong className="text-white">{currentFile}</strong></span>
                <span>·</span>
                <span>Chunks: <strong className="text-white">{stats.chunks}</strong></span>
                <span>·</span>
                <span>Hallucinations blocked: <strong className="text-white">{stats.hallucinations}</strong></span>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
