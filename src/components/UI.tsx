import { AlertCircle, BrainCircuit, Check, Loader2, Sparkles } from "lucide-react";

export const Page = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => <section className="mx-auto max-w-[1440px]">
  <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50 text-violet-600 shadow-sm"><Sparkles size={20}/></span>
      <div><p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-violet-500">Your brand, remembered</p><h1 className="page-heading text-3xl font-extrabold tracking-tight">{title}</h1></div>
    </div>
    {action}
  </header>
  {children}
</section>;

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`card p-5 sm:p-6 ${className}`}>{children}</div>;

export const State = ({ loading, error }: { loading: boolean; error?: string }) => loading
  ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-white/80 px-4 py-3 text-sm font-medium text-violet-700"><Loader2 className="animate-spin" size={17}/>Loading your brand insights…</div>
  : error ? <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="shrink-0" size={18}/>{error}</div> : null;

export const MemoryBadge = ({ count }: { count: number }) => <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-1.5 text-xs font-bold text-violet-700"><BrainCircuit size={14}/> {count} relevant memories</span>;

export const Why = ({ items, title = "Why?" }: { items: string[]; title?: string }) => <div><h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Check size={14}/></span>{title}</h3><ul className="space-y-2 text-sm leading-6 text-slate-600">{items.map((x, i) => <li className="rounded-xl bg-gradient-to-r from-violet-50/70 to-transparent px-3 py-2" key={`${i}-${x}`}>{x}</li>)}</ul></div>;
