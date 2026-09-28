import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getMemoryExplorer, getTimeline } from "../api";
import { mockTimeline, mockTree } from "../mocks/data";
import { Card, Page, State } from "../components/UI";
import type { MemoryNode, TimelineItem } from "../types";

function Tree({ nodes, onSelect, selectedId }: { nodes: MemoryNode[]; onSelect: (node: MemoryNode) => void; selectedId?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ history: true });
  return <ul className="space-y-1">{nodes.map((node) => <li key={node.id}>
    <div className={`flex items-center rounded-lg pr-3 text-sm ${selectedId === node.id ? "bg-violet-50 text-violet-800" : "hover:bg-slate-100"}`}>
      {node.children?.length ? <button className="p-2" aria-label={`${open[node.id] ? "Collapse" : "Expand"} ${node.label}`} onClick={() => setOpen((value) => ({ ...value, [node.id]: !value[node.id] }))}>{open[node.id] ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button> : <span className="w-9"/>}
      <button className="flex flex-1 items-center justify-between gap-2 py-2 text-left" onClick={() => onSelect(node)}><span>{node.label}</span>{typeof node.memoryCount === "number" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">{node.memoryCount}</span>}</button>
    </div>
    {node.children?.length && open[node.id] && <div className="ml-4 border-l pl-2"><Tree nodes={node.children} onSelect={onSelect} selectedId={selectedId}/></div>}
  </li>)}</ul>;
}

function sumCounts(nodes: MemoryNode[]): number | undefined {
  if (nodes.length === 0) return 0;
  let total = 0;
  for (const node of nodes) {
    const count = node.children?.length ? sumCounts(node.children) : node.memoryCount;
    if (typeof count !== "number") return undefined;
    total += count;
  }
  return total;
}

export default function MemoryExplorer() {
  const [tree, setTree] = useState<MemoryNode[]>(mockTree);
  const [timeline, setTimeline] = useState<TimelineItem[]>(mockTimeline);
  const [selected, setSelected] = useState<MemoryNode | null>(mockTree[0] ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => sumCounts(tree), [tree]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMemoryExplorer(), getTimeline()]).then(([nodes, events]) => {
      setTree(nodes);
      setTimeline(events);
      setSelected(nodes[0] ?? null);
    }).catch(() => setError("REST API unavailable — showing seeded sample memories, not live Hindsight data.")).finally(() => setLoading(false));
  }, []);

  return <Page title="Memory Explorer">
    <State loading={loading} error={error}/>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4"><div><p className="font-semibold text-violet-950">Persistent brand memory</p><p className="mt-1 text-sm text-violet-800">Browse retained brand knowledge, audience feedback, performance, experiments, and decisions.</p></div>{typeof total === "number" && <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-violet-800">{total} memories reported by API</span>}</div>
    <div className="grid gap-4 lg:grid-cols-3"><Card><h2 className="mb-3 font-semibold">Memory categories</h2>{tree.length ? <Tree nodes={tree} onSelect={setSelected} selectedId={selected?.id}/> : <p className="text-sm text-slate-500">The API returned no memory categories.</p>}</Card><Card className="lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{selected?.label ?? "Memory details"}</h2>{typeof selected?.memoryCount === "number" && <span className="text-xs text-slate-500">{selected.memoryCount} memories</span>}</div><div className="mt-4 space-y-2 text-sm text-slate-600">{selected?.detail?.length ? selected.detail.map((item,index)=><p className="rounded-lg bg-slate-50 p-3" key={`${index}-${item}`}>{item}</p>) : <p>Select a category to inspect details. Details appear here when returned by the API.</p>}</div></Card></div>
    <Card className="mt-4"><h2 className="mb-5 font-semibold">Memory timeline</h2>{timeline.length ? <div className="space-y-5 border-l-2 border-slate-200 pl-5">{timeline.map((item,index)=><div className="relative" key={`${item.month}-${index}`}><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-violet-600"/><p className="text-xs font-bold text-slate-500">{item.month}</p><p className="text-sm">{item.text}</p></div>)}</div> : <p className="text-sm text-slate-500">No timeline events were returned.</p>}</Card>
  </Page>;
}
