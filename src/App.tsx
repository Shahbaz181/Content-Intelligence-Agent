import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BrandProfile from "./pages/BrandProfile";
import ContentLibrary from "./pages/ContentLibrary";
import Analytics from "./pages/Analytics";
import Strategist from "./pages/Strategist";
import MemoryExplorer from "./pages/MemoryExplorer";
import Planner from "./pages/Planner";
import BeforeAfter from "./pages/BeforeAfter";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/brand" element={<BrandProfile />} />
          <Route path="/content" element={<ContentLibrary />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/strategist" element={<Strategist />} />
          <Route path="/memory" element={<MemoryExplorer />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/before-after" element={<BeforeAfter />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
