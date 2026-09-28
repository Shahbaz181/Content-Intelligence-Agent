import { useState } from "react";
import { askAgent } from "../api";
import { Card, MemoryBadge, Page, Why } from "../components/UI";
import type { AgentResponse } from "../types";

const question = "What should we post about next for our audience?";

export default function BeforeAfter() {
  const [answer, setAnswer] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");

  const replay = async () => {
    setLoading(true);
    setError("");
    try {
      setAnswer(await askAgent(question));
      setDemo(false);
    } catch {
      setAnswer(null);
      setDemo(true);
      setError("The REST API is unavailable, so no live before/after memory comparison can be made.");
    } finally {
      setLoading(false);
    }
  };

  return <Page title="Before / After Demo" action={<button className="btn btn-primary" onClick={() => void replay()} disabled={loading}>{loading ? "Querying API…" : "Ask the live agent"}</button>}>
    <p className="mb-4 text-sm text-slate-500">Example question: <b>{question}</b></p>
    {error && <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-slate-100"><span className="text-xs font-bold uppercase text-slate-500">Without memory · illustration</span><h2 className="mt-3 text-xl font-bold text-slate-700">A broad, generic suggestion</h2><p className="mt-3 text-sm text-slate-600">A stateless response has no retained brand history or past audience feedback to draw on.</p></Card>
      <Card className="border-violet-200"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-bold uppercase text-violet-700">Live API response</span>{answer && <MemoryBadge count={answer.memoriesUsed} />}</div>{answer ? <><h2 className="mt-3 text-xl font-bold">{answer.recommendation}</h2>{answer.format && <p className="mt-1 text-sm text-slate-500">{answer.format}</p>}{answer.learnedFromFeedback && <p className="mt-3 text-sm font-medium text-emerald-700">Learned from previous feedback</p>}<div className="mt-5"><Why title="Why this response?" items={answer.reasoning}/></div>{answer.relevantMemories?.length ? <div className="mt-5"><h3 className="font-semibold">Relevant memories</h3>{answer.relevantMemories.map((item,index)=><p className="mt-2 rounded-lg bg-violet-50 p-3 text-sm" key={`${index}-${item}`}>{item}</p>)}</div> : <p className="mt-4 text-sm text-slate-500">No relevant memory details were returned.</p>}</> : <p className="mt-3 text-sm text-slate-600">{demo ? "Live result unavailable. Connect the REST API to show what the agent recalls." : "Ask the live agent to show its recommendation, memory count, and rationale here."}</p>}</Card>
    </div>
  </Page>;
}
