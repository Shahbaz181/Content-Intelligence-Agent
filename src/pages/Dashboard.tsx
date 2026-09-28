import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BarChart3, BrainCircuit, Lightbulb, LineChart as LineIcon, Sparkles, Target, UsersRound } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalytics } from "../api";
import { mockAnalytics } from "../mocks/data";
import { Page, Card, State } from "../components/UI";

const shortcuts = [
  { to: "/strategist", label: "Ask the AI Strategist", note: "Turn memory into your next move", Icon: Sparkles, color: "text-violet-600", tile: "bg-violet-100" },
  { to: "/memory", label: "Explore learned memories", note: "See what your brand has taught us", Icon: BrainCircuit, color: "text-cyan-700", tile: "bg-cyan-100" },
  { to: "/content", label: "Browse content history", note: "Revisit every post and result", Icon: BarChart3, color: "text-orange-600", tile: "bg-orange-100" },
];

export default function Dashboard() {
  const [data, setData] = useState(mockAnalytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getAnalytics().then(setData).catch(() => setError("Backend unavailable — showing seeded demo data.")).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Strategic memories", value: data.memory.strategic, Icon: BrainCircuit, color: "text-violet-700", tile: "from-violet-100 to-fuchsia-100", note: "decisions retained" },
    { label: "Audience patterns", value: data.memory.audience, Icon: UsersRound, color: "text-cyan-700", tile: "from-cyan-100 to-sky-100", note: "preferences learned" },
    { label: "Content opportunities", value: data.memory.gaps, Icon: Target, color: "text-orange-700", tile: "from-orange-100 to-amber-100", note: "gaps uncovered" },
  ];

  return <Page title="Dashboard">
    <State loading={loading} error={error}/>
    <section className="relative mb-5 overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-[#392f78] via-[#704fc1] to-[#bc68ba] p-6 text-white shadow-lg shadow-violet-200/70 sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10"/><div className="pointer-events-none absolute -bottom-28 right-48 h-52 w-52 rounded-full bg-cyan-300/15 blur-2xl"/>
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.15em]"><Sparkles size={13}/> Memory-powered workspace</span><h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Your best content starts with what you’ve learned.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-violet-100">See what’s resonating, understand your audience, and turn every past result into a smarter next step.</p></div>
        <Link className="btn inline-flex items-center gap-2 bg-white text-violet-800 shadow-md hover:bg-violet-50" to="/strategist">Build my next strategy <ArrowUpRight size={16}/></Link>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="bg-gradient-to-br from-white to-emerald-50/80"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">Brand health</p><p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-800">{data.health === null ? "—" : data.health}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><LineIcon size={21}/></span></div><p className="mt-3 text-xs leading-5 text-slate-500">{data.status}</p></Card>
      {stats.map(({ label, value, Icon, color, tile, note }) => <Card className="bg-gradient-to-br from-white to-violet-50/35" key={label}><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-800">{value}</p></div><span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tile} ${color}`}><Icon size={21}/></span></div><p className="mt-3 text-xs text-slate-500">{note}</p></Card>)}
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-slate-800">Content performance</h2><p className="mt-1 text-xs text-slate-500">{data.metricLabel ?? "Engagement over time"}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><LineIcon size={18}/></span></div>
        {data.performance.length ? <div className="h-64"><ResponsiveContainer><AreaChart data={data.performance} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={.28}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#eeedf5" strokeDasharray="4 5"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9294a8", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9294a8", fontSize: 11 }}/><Tooltip contentStyle={{ borderRadius: 14, borderColor: "#ece9f8", boxShadow: "0 8px 28px #38227618" }}/><Area type="monotone" dataKey="value" stroke="#8459e8" strokeWidth={3} fill="url(#performanceFill)" activeDot={{ r: 5, strokeWidth: 0, fill: "#d15eb8" }}/></AreaChart></ResponsiveContainer></div> : <div className="grid h-64 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-cyan-50"><div className="text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><BarChart3/></span><p className="mt-3 text-sm font-semibold text-slate-700">Your performance story starts here</p><p className="mt-1 text-xs text-slate-500">Import content metrics to see the trend.</p></div></div>}
      </Card>
      <Card><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-800">Your next step</h2><p className="mt-1 text-xs text-slate-500">Explore your content intelligence</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><Lightbulb size={18}/></span></div><div className="space-y-2.5">{shortcuts.map(({ to, label, note, Icon, color, tile }) => <Link className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm" key={to} to={to}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tile} ${color}`}><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{note}</span></span><ArrowUpRight className="text-slate-300 transition group-hover:text-violet-600" size={16}/></Link>)}</div></Card>
    </div>
  </Page>;
}
