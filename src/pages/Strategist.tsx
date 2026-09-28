import { useState } from "react";
import { askAgent, submitFeedback } from "../api";
import { Card, MemoryBadge, Page, Why } from "../components/UI";
import type { AgentResponse } from "../types";

type AnswerEntry = { question: string; answer: AgentResponse; demo: boolean };

export default function Strategist() {
  const [question, setQuestion] = useState("What should we post about next?");
  const [answer, setAnswer] = useState<AgentResponse | null>(null);
  const [history, setHistory] = useState<AnswerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await askAgent(question.trim());
      setAnswer(result);
      setDemo(false);
      setHistory((items) => [{ question: question.trim(), answer: result, demo: false }, ...items]);
    } catch {
      const example: AgentResponse = {
        recommendation: "Explore a practical, audience-focused content idea",
        format: "Example only",
        reasoning: ["This sample demonstrates where API-provided rationale appears."],
        memoriesUsed: 0,
        relevantMemories: [],
      };
      setAnswer(example);
      setDemo(true);
      setError("The REST API is unavailable. This is seeded example content; it did not query Hindsight.");
      setHistory((items) => [{ question: question.trim(), answer: example, demo: true }, ...items]);
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedback.trim()) return;
    setSendingFeedback(true);
    setFeedbackStatus("");
    try {
      await submitFeedback(feedback.trim());
      setFeedbackStatus("Feedback retained by Hindsight. Ask another question to see how future reflections use it.");
      setFeedback("");
    } catch {
      setFeedbackStatus("Feedback was not saved. Check the REST server and Hindsight connection.");
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <Page title="AI Strategist">
      <Card>
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
          <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your content strategy" />
          <button className="btn btn-primary whitespace-nowrap" disabled={loading}>{loading ? "Generating…" : "Generate Strategy"}</button>
        </form>
      </Card>

      {error && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}

      {answer && <Card className="mt-4 border-violet-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase text-violet-700">Recommendation</span>
          {demo ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Sample — no live memory query</span> : <MemoryBadge count={answer.memoriesUsed} />}
        </div>
        <h2 className="mt-3 text-xl font-bold">{answer.recommendation}</h2>
        {answer.format && <p className="mt-1 text-sm text-slate-500">Suggested format: {answer.format}</p>}
        {answer.learnedFromFeedback && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Learned from previous feedback</p>}
        <div className="mt-6"><Why title="Why this recommendation?" items={answer.reasoning} /></div>
        {!demo && <section className="mt-6 border-t pt-4">
          <h3 className="font-semibold">Relevant memories</h3>
          {answer.relevantMemories?.length ? <ul className="mt-2 space-y-2 text-sm text-slate-600">{answer.relevantMemories.map((memory, index) => <li className="rounded-lg bg-violet-50 p-3" key={`${index}-${memory}`}>{memory}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">The API did not include relevant memory details for this answer.</p>}
        </section>}
        {!demo && <section className="mt-6 border-t pt-4">
          <h3 className="font-semibold">Teach the agent</h3>
          <p className="mt-1 text-sm text-slate-500">Your feedback is retained as a Hindsight memory and can influence later audience-preference reflections.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="input" maxLength={4000} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Tell the agent what was useful or off-target"/><button className="btn btn-soft whitespace-nowrap" onClick={() => void sendFeedback()} disabled={sendingFeedback || !feedback.trim()}>{sendingFeedback ? "Saving…" : "Save feedback to memory"}</button></div>
          {feedbackStatus && <p className="mt-2 text-sm text-slate-600" role="status">{feedbackStatus}</p>}
        </section>}
      </Card>}

      <Card className="mt-4">
        <h2 className="font-semibold">Session history</h2>
        {history.length === 0 ? <p className="mt-3 text-sm text-slate-500">Your questions and recommendations will appear here.</p> : history.map((entry, index) => <div className="mt-4 border-t pt-3" key={`${index}-${entry.question}`}>
          <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">Q: {entry.question}</p><span className="text-xs text-slate-500">{entry.demo ? "Sample" : `Based on ${entry.answer.memoriesUsed} memories`}</span></div>
          <p className="mt-1 text-sm text-slate-600">A: {entry.answer.recommendation}</p>
        </div>)}
      </Card>
    </Page>
  );
}
