"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Activity, BrainCircuit, Database, BarChart3, FileText, Network, Sparkles } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// CoverFi-exact Floating Orbs
export function GlowOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top-left teal blob */}
      <motion.div animate={{ x:[0,25,0], y:[0,-18,0], scale:[1,1.08,1] }} transition={{ repeat:Infinity, duration:9, ease:"easeInOut" }}
        style={{ position:"absolute", top:"4%", left:"6%", width:220, height:220, borderRadius:"50%", background:"rgba(20,184,166,0.14)", filter:"blur(65px)" }} />
      {/* Top-right violet blob */}
      <motion.div animate={{ x:[0,-22,0], y:[0,25,0], scale:[1,1.12,1] }} transition={{ repeat:Infinity, duration:11, ease:"easeInOut", delay:1 }}
        style={{ position:"absolute", top:"6%", right:"7%", width:190, height:190, borderRadius:"50%", background:"rgba(139,92,246,0.16)", filter:"blur(55px)" }} />
      {/* Bottom-left blue blob */}
      <motion.div animate={{ x:[0,18,0], y:[0,-12,0], scale:[1,1.06,1] }} transition={{ repeat:Infinity, duration:13, ease:"easeInOut", delay:2 }}
        style={{ position:"absolute", bottom:"12%", left:"4%", width:200, height:200, borderRadius:"50%", background:"rgba(59,130,246,0.12)", filter:"blur(60px)" }} />
      {/* Bottom-right gold blob — CoverFi signature */}
      <motion.div animate={{ x:[0,-18,0], y:[0,18,0], scale:[1,1.1,1] }} transition={{ repeat:Infinity, duration:8, ease:"easeInOut", delay:0.5 }}
        style={{ position:"absolute", bottom:"18%", right:"8%", width:170, height:170, borderRadius:"50%", background:"rgba(240,185,11,0.10)", filter:"blur(50px)" }} />
      {/* Center deep violet */}
      <motion.div animate={{ scale:[1,1.15,1] }} transition={{ repeat:Infinity, duration:15, ease:"easeInOut", delay:3 }}
        style={{ position:"absolute", top:"40%", left:"42%", width:350, height:350, borderRadius:"50%", background:"rgba(139,92,246,0.06)", filter:"blur(90px)" }} />
      {/* Subtle dot grid */}
      <div style={{ position:"absolute", inset:0, opacity:0.02, backgroundImage:"radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize:"30px 30px" }} />
    </div>
  );
}

// Animated Stat Card — CoverFi style
export function StatCard({ label, value, color="text-white", delay=0 }: { label: string, value: string, color?: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative group cursor-default"
      whileHover={{ y: -3, scale: 1.02 }}
    >
      <div className="relative glass-panel p-4 text-center overflow-hidden" style={{ borderRadius:"1.25rem" }}>
        {/* Top shimmer line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(240,185,11,0.3),transparent)" }} />
        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-[0.12em] font-medium">{label}</p>
        <motion.p
          key={value}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type:"spring", stiffness:300, damping:20 }}
          className={`text-2xl font-bold font-mono ${color}`}
          style={{ lineHeight: 1 }}
        >{value || "—"}</motion.p>
      </div>
    </motion.div>
  );
}

// Neon Agent Card
export function AgentCard({ agent, isActive, isDone }: { agent: any, isActive: boolean, isDone: boolean }) {
  return (
    <motion.div
      layout
      animate={isActive ? { boxShadow: [`0 0 0px ${agent.glow}`, `0 0 20px ${agent.glow}`, `0 0 0px ${agent.glow}`] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      className={`relative p-3 rounded-xl border transition-all duration-500 overflow-hidden ${
        isActive ? `border-${agent.color}-500/50 bg-${agent.color}-500/5` :
        isDone ? "border-emerald-500/20 bg-emerald-500/5" :
        "border-white/5 bg-transparent"
      }`}
    >
      {isActive && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      )}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? `bg-${agent.color}-400 animate-pulse` : isDone ? "bg-emerald-400" : "bg-white/20"}`} />
          <span className={`text-sm font-medium ${isActive ? "text-white" : isDone ? "text-emerald-300" : "text-muted-foreground"}`}>
            {agent.name}
          </span>
        </div>
        <AnimatePresence mode="wait">
          {isActive && (
            <motion.span key="active" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
              className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full">
              RUNNING
            </motion.span>
          )}
          {isDone && (
            <motion.span key="done" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {isActive && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 3, ease: "linear" }}
          style={{ originX: 0 }}
          className={`h-0.5 mt-2 rounded-full bg-gradient-to-r from-transparent via-${agent.color}-400 to-transparent`}
        />
      )}
    </motion.div>
  );
}

// Annotation Heatmap
export function AnnotationHeatmap({ annotations }: { annotations: any[] }) {
  if (!annotations.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl border border-white/8">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-orange-400" />
        <span>Confidence Heatmap</span>
        <span className="text-xs text-muted-foreground">— per-chunk quality grid</span>
      </h3>
      <div className="flex flex-wrap gap-1.5 items-center">
        {annotations.map((a: any, i: number) => {
          const acc = Number(a.accuracy);
          const bg = acc >= 96 ? "#10b981" : acc >= 92 ? "#22c55e" : acc >= 88 ? "#eab308" : "#ef4444";
          return (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              title={`C${a.chunk}: ${acc.toFixed(1)}% | ${a.domain}${a.selfHealed ? " ⚕️" : ""}`}
              style={{ backgroundColor: bg }}
              className="relative w-10 h-10 rounded-lg opacity-85 hover:opacity-100 hover:scale-110 transition-all cursor-pointer flex items-center justify-center group shadow-lg"
            >
              <span className="text-[10px] font-bold text-black select-none">{acc.toFixed(0)}</span>
              {a.selfHealed && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full text-[8px] flex items-center justify-center text-black shadow-sm">⚕</span>
              )}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col z-30 bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs whitespace-nowrap shadow-2xl gap-0.5">
                <span className="text-white font-semibold">C{a.chunk} · {a.domain}</span>
                <span className="text-muted-foreground">Accuracy: {acc.toFixed(1)}% · Conf: {(Number(a.confidence)*100).toFixed(1)}%</span>
                {a.selfHealed && <span className="text-emerald-400">⚕️ Auto self-healed</span>}
              </div>
            </motion.div>
          );
        })}
        <div className="flex items-center gap-3 ml-3 flex-wrap">
          {[["#10b981","≥96%"],["#22c55e","≥92%"],["#eab308","≥88%"],["#ef4444","<88%"]].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 rounded" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Live Annotation Preview Card
export function AnnotationPreview({ annotations }: { annotations: any[] }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/8 h-full">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-purple-400" />
        <span>Live Annotation Preview</span>
        <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">LIVE</span>
      </h3>
      <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
        {!annotations.length && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2">
            <Network className="w-8 h-8 opacity-30" />
            Awaiting pipeline...
          </div>
        )}
        <AnimatePresence>
          {[...annotations].reverse().slice(0, 4).map((a: any, i: number) => (
            <motion.div
              key={a.chunk}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/8 rounded-xl p-3 font-mono text-xs hover:border-white/15 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-violet-400 font-bold">C{a.chunk}</span>
                <div className="flex items-center gap-1.5">
                  {a.verifier_status === "Self-Corrected" && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md">⚕ Healed</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${Number(a.accuracy) >= 92 ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"}`}>{Number(a.accuracy).toFixed(1)}%</span>
                </div>
              </div>
              <details className="cursor-pointer group">
                <summary className="text-[11px] text-white/70 hover:text-white mb-1 focus:outline-none flex justify-between">
                  <span>Structured Output (JSON)</span>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="space-y-1 text-[11px] mt-2 bg-black/20 p-2 rounded border border-white/5">
                  <p><span className="text-blue-400">"label"</span>: <span className="text-emerald-300">"{a.label}"</span>,</p>
                  <p><span className="text-blue-400">"sentiment"</span>: <span className="text-emerald-300">"{a.sentiment}"</span>,</p>
                  <p><span className="text-blue-400">"confidence"</span>: <span className="text-yellow-400">{Number(a.confidence).toFixed(3)}</span>,</p>
                  
                  <p><span className="text-blue-400">"entities"</span>: <span className="text-white/60">[</span></p>
                  <div className="pl-3 space-y-0.5">
                    {(a.entities||[]).map((e:string, i:number, arr:string[])=>(
                       <p key={i}><span className="text-orange-300">"{e}"</span>{i < arr.length-1 ? "," : ""}</p>
                    ))}
                  </div>
                  <p className="text-white/60">],</p>

                  <p className="text-white/60">],</p>
                  
                  <p><span className="text-blue-400">"evidence_span"</span>: <span className="text-orange-300">"{a.evidence_span}"</span>,</p>
                  <p><span className="text-blue-400">"support_score"</span>: <span className="text-yellow-400">{Number(a.support_score).toFixed(3)}</span>,</p>

                  <p><span className="text-blue-400">"contradictions_detected"</span>: <span className="text-white/60">[</span></p>
                  <div className="pl-3 space-y-0.5">
                    {(a.contradictions_detected||[]).map((e:string, i:number, arr:string[])=>(
                       <p key={i} className={e === "None detected" ? "text-emerald-400" : "text-red-400"}>"{e}"{i < arr.length-1 ? "," : ""}</p>
                    ))}
                  </div>
                  <p className="text-white/60">],</p>
                  
                  <p><span className="text-blue-400">"verifier_status"</span>: <span className="text-emerald-300">"{a.verifier_status}"</span>,</p>
                  <p><span className="text-blue-400">"hallucination_risk"</span>: <span className={a.hallucination_risk==="High" ? "text-red-400" : "text-emerald-400"}>"{a.hallucination_risk}"</span></p>
                </div>
              </details>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ICL Prompt Inspector
export function ICLInspector({ annotations }: { annotations: any[] }) {
  const examples = [
    { label: "Financial", text: "Revenue grew 14% YoY to $1.2B...", sentiment: "Positive", conf: "0.96" },
    { label: "Medical", text: "Patient presented with acute symptoms...", sentiment: "Neutral", conf: "0.94" },
    { label: "Legal", text: "Parties agree to binding arbitration...", sentiment: "Neutral", conf: "0.97" },
    { label: "Technical", text: "The transformer architecture achieved...", sentiment: "Positive", conf: "0.95" },
    { label: "Scientific", text: "Statistical significance was p<0.05...", sentiment: "Neutral", conf: "0.93" },
  ];
  const latest = annotations[annotations.length - 1];
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/8 h-full">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 text-blue-400" />
        <span>ICL Prompt Inspector</span>
        <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{examples.length} EXAMPLES</span>
      </h3>
      <div className="space-y-2 font-mono text-[11px] max-h-[300px] overflow-y-auto pr-1">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <p className="text-blue-400 mb-1 font-bold">▸ SYSTEM</p>
          <p className="text-muted-foreground leading-relaxed">Expert annotator for long-context docs. Apply ICL with {examples.length}-shot examples to produce structured labels.</p>
        </div>
        {examples.map((ex, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
            className="bg-white/[0.03] border border-white/8 rounded-xl p-2.5">
            <p className="text-yellow-400 font-bold mb-1">▸ EXAMPLE {i+1}</p>
            <p className="text-muted-foreground">In: "{ex.text}"</p>
            <p className="text-emerald-400">Out: {`{label:"${ex.label}", sentiment:"${ex.sentiment}", confidence:${ex.conf}}`}</p>
          </motion.div>
        ))}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
          <p className="text-violet-400 font-bold mb-1">▸ CURRENT CHUNK</p>
          <p className="text-white/70">{latest ? `"${latest.summary?.slice(0, 100)}..."` : "Awaiting ingestion..."}</p>
        </div>
      </div>
    </div>
  );
}

// Quality Chart Panel
export function QualityChart({ data }: { data: any[] }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/8 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          Quality Calibration Matrix
        </h3>
        <div className="flex gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" />Accuracy</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Confidence</span>
        </div>
      </div>
      <div className="h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#3f3f46" tick={{fill:"#71717a",fontSize:10}} />
            <YAxis stroke="#3f3f46" tick={{fill:"#71717a",fontSize:10}} domain={[60,100]} />
            <Tooltip contentStyle={{background:"#09090b",border:"1px solid #27272a",borderRadius:"12px",fontSize:"12px"}} />
            <Area type="monotone" dataKey="accuracy" stroke="#8b5cf6" fill="url(#gA)" strokeWidth={2} dot={{ fill:"#8b5cf6", r:3 }} isAnimationActive />
            <Area type="monotone" dataKey="confidence" stroke="#3b82f6" fill="url(#gC)" strokeWidth={2} dot={{ fill:"#3b82f6", r:3 }} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
        {!data.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Sparkles className="w-6 h-6 opacity-30" />
            Awaiting inference...
          </div>
        )}
      </div>
    </div>
  );
}

// Annotation Lineage Tracking
export function AnnotationLineage({ annotations }: { annotations: any[] }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/8 h-full">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Network className="w-4 h-4 text-emerald-400" />
        <span>Annotation Lineage</span>
      </h3>
      <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
        {!annotations.length && (
           <div className="text-muted-foreground text-xs text-center py-10 flex flex-col items-center gap-2">
             <Network className="w-6 h-6 opacity-30" />
             Awaiting data...
           </div>
        )}
        <AnimatePresence>
          {[...annotations].reverse().slice(0, 5).map((a: any, i: number) => (
            <motion.div key={a.chunk} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
               className="bg-white/[0.03] border border-white/8 rounded-xl p-3 text-xs">
              <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                <span className="font-bold text-white">ID: {a.source_chunk || `A-204${a.chunk}`}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${a.hallucination_risk==="High" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  Risk: {a.hallucination_risk}
                </span>
              </div>
              <div className="mt-3 space-y-2 border-t border-white/10 pt-2 text-[10px] text-muted-foreground font-mono bg-black/20 p-2 rounded-lg">
                <p className="text-white/80 border-b border-white/5 pb-1">Matched Entities:</p>
                <div className="flex flex-wrap gap-1">
                  {(a.matched_entities||[]).map((e:string,idx:number)=>(
                    <span key={idx} className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">{e}</span>
                  ))}
                  {(!a.matched_entities || a.matched_entities.length === 0) && <span className="text-red-400">0 grounded terms</span>}
                </div>
                
                {a.unsupported_claims?.length > 0 && (
                  <>
                    <p className="text-red-300 border-b border-white/5 pb-1 mt-2">Unsupported Claims:</p>
                    <ul className="list-disc pl-4 text-red-400/80">
                      {a.unsupported_claims.map((c:string,idx:number)=><li key={idx}>{c}</li>)}
                    </ul>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                  <p>Entity Grounding: <span className="text-blue-400">{(Number(a.entity_grounding_score)*100).toFixed(0)}%</span></p>
                  <p>Semantic Similarity: <span className="text-violet-400">{Number(a.semantic_match_score).toFixed(2)}</span></p>
                  <p>Verifier Consensus: <span className="text-yellow-400">{a.verifier_consensus}</span></p>
                  <p>Evidence Source: <span className="text-white">C{a.chunk}</span></p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
