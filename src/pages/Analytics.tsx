import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalytics } from "../api";
import { mockAnalytics } from "../mocks/data";
import { Card, Page, State } from "../components/UI";
import type { Analytics as AnalyticsData } from "../types";

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>(mockAnalytics);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getAnalytics().then((value) => { setData(value); setDemo(false); })
      .catch(() => { setDemo(true); setError("REST API unavailable — showing the synthetic sample dataset."); })
      .finally(() => setLoading(false));
  }, []);

  return <Page title="Analytics">
    <p className={`mb-4 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${data.dataSource === "synthetic" || demo ? "border-amber-200 bg-amber-50 text-amber-800" : data.dataSource === "mixed" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{demo || data.dataSource === "synthetic" ? "Synthetic sample dataset · not live account metrics" : data.dataSource === "mixed" ? "Live and synthetic records · review sample labels" : data.metricLabel ? `Live API data · ${data.metricLabel}` : "Figures returned by the REST API."}</p>
    <State loading={loading} error={error}/>
    <Card><h2 className="mb-4 font-semibold">Performance over time {data.metricLabel && <span className="font-normal text-slate-500">· {data.metricLabel}</span>}</h2>{data.performance.length ? <div className="h-64"><ResponsiveContainer><LineChart data={data.performance}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3}/></LineChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-slate-500">No dated performance metrics are available yet.</p>}</Card>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card><h2 className="mb-4 font-semibold">By content type</h2>{data.byType.length ? <div className="h-64"><ResponsiveContainer><BarChart data={data.byType}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#7c3aed"/></BarChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-slate-500">No tracked metrics by content type yet.</p>}</Card><Card><h2 className="mb-4 font-semibold">By platform</h2>{data.byPlatform.length ? <div className="h-64"><ResponsiveContainer><BarChart data={data.byPlatform}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#0891b2"/></BarChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-slate-500">No tracked metrics by platform yet.</p>}</Card></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Card><h2 className="font-semibold">Top performing</h2>{data.top.length ? data.top.map((item) => <p className="mt-2 text-sm" key={item}>↑ {item}</p>) : <p className="mt-2 text-sm text-slate-500">No ranked content yet.</p>}</Card><Card><h2 className="font-semibold">Weak performing</h2>{data.weak.length ? data.weak.map((item) => <p className="mt-2 text-sm" key={item}>↓ {item}</p>) : <p className="mt-2 text-sm text-slate-500">No ranked content yet.</p>}</Card></div>
  </Page>;
}
