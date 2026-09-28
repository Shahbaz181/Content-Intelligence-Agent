import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeftRight, BarChart3, BrainCircuit, CalendarDays, ChevronRight, GitBranch, LayoutDashboard, Library, Sparkles, UserRound, WandSparkles } from "lucide-react";

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/brand", "Brand Profile", UserRound],
  ["/content", "Content Library", Library],
  ["/analytics", "Analytics", BarChart3],
  ["/strategist", "AI Strategist", Sparkles],
  ["/memory", "Memory Explorer", GitBranch],
  ["/planner", "Content Planner", CalendarDays],
  ["/before-after", "Before / After", ArrowLeftRight],
] as const;

function Logo() {
  return <div className="flex items-center gap-3 px-2 py-5">
    <span className="brand-mark"><BrainCircuit size={23}/></span>
    <span><span className="block text-[15px] font-extrabold tracking-tight text-slate-900">Hindsight</span><span className="block text-[10px] font-bold uppercase tracking-[.17em] text-violet-500">Content intelligence</span></span>
  </div>;
}

function Links({ mobile = false }: { mobile?: boolean }) {
  return <nav aria-label="Main navigation" className={mobile ? "flex gap-1 overflow-x-auto pb-1" : "space-y-1.5"}>
    {nav.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${mobile ? "shrink-0" : "flex w-full"} ${isActive ? mobile ? "mobile-nav-link-active" : "nav-link-active" : "text-slate-600 hover:bg-violet-50 hover:text-violet-800"} flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold`}>
      <Icon size={17} strokeWidth={1.9}/><span>{label}</span>{!mobile && <ChevronRight className="ml-auto opacity-40" size={14}/>}
    </NavLink>)}
  </nav>;
}

export default function Layout() {
  return <div className="min-h-screen">
    <aside className="app-sidebar fixed inset-y-0 z-20 hidden w-[258px] flex-col p-4 md:flex">
      <Logo/>
      <p className="mb-2 mt-6 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">Workspace</p>
      <Links/>
      <div className="mt-auto rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 p-4">
        <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><WandSparkles size={18}/></span>
        <p className="text-sm font-bold text-slate-800">Memory that gets smarter</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Your content history helps every next recommendation improve.</p>
        <NavLink to="/memory" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700">Explore memory <ChevronRight size={14}/></NavLink>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-violet-100 px-2 pt-4 text-[11px] font-medium text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-100"/> Memory workspace ready</div>
    </aside>
    <header className="app-sidebar sticky top-0 z-20 border-b p-3 md:hidden">
      <Logo/>
      <Links mobile/>
    </header>
    <main className="p-4 sm:p-6 md:ml-[258px] md:p-8 lg:p-10"><Outlet/></main>
  </div>;
}
