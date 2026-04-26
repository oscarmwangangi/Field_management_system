import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
// const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  
});
// ── Types ─────────────────────────────────────────────────────────────────────
interface Field {
  id: number;
  name: string;
  crop_type: string;
  status: "active" | "at_risk" | "completed";
  planting_date: string | null;
  assigned_agent: { id: number; first_name: string; last_name: string } | null;
  latest_update: { stages: string; notes: string; updated_by_name: string; created_at: string } | null;
  days_since_update: number | null;
}
interface Agent {
  id: number;
  first_name: string;
  last_name: string;
  fields_count: number;
  at_risk_count: number;
  completed_count: number;
  performance: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function avatarColor(name: string): [string, string] {
  const palette: [string, string][] = [
    ["#dcfce7", "#15803d"],
    ["#eff6ff", "#1d4ed8"],
    ["#fce7f3", "#9d174d"],
    ["#fef9c3", "#854d0e"],
    ["#f3e8ff", "#6b21a8"],
  ];
  const i = (name.charCodeAt(0) ?? 0) % palette.length;
  return palette[i];
}

// ── Mini Bar Chart (harvests by month) ───────────────────────────────────────
function HarvestBarChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const H = 80;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, paddingTop: 24, position: "relative" }}>
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * H, 4);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            {d.count > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{d.count}</span>
            )}
            <div style={{ width: "100%", height: barH, background: "#16a34a", borderRadius: "4px 4px 0 0", opacity: 0.85, transition: "height 0.5s ease" }} />
            <span style={{ fontSize: 10, color: "#9ca3af" }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stage Distribution Bars ───────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  planted: "#3b82f6", growing: "#16a34a", ready: "#10b981", harvested: "#9ca3af",
};

function StageDistribution({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const stages = ["planted", "growing", "ready", "harvested"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map(s => {
        const n = counts[s] ?? 0;
        const pct = (n / total) * 100;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS[s], flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#374151", width: 80, textTransform: "capitalize" }}>{s}</span>
            <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: STAGE_COLORS[s], borderRadius: 99, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", width: 16, textAlign: "right" }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Activity Timeline ─────────────────────────────────────────────────────────
interface TimelineEvent {
  label: string;
  sub: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  dotColor: string;
}

function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No recent activity.</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {events.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14,
          padding: "14px 0", borderBottom: i < events.length - 1 ? "1px solid #f3f4f6" : "none" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: e.dotColor, flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{e.label}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{e.sub}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
            background: e.tagBg, color: e.tagColor, whiteSpace: "nowrap" }}>{e.tag}</span>
        </div>
      ))}
    </div>
  );
}

// ── Agent Performance Card ────────────────────────────────────────────────────
function AgentPerfCard({ agent }: { agent: Agent }) {
  const [bg, color] = avatarColor(agent.first_name);
  const perf = Math.min(agent.performance, 100);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "16px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>
          {initials(agent.first_name, agent.last_name)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
            {agent.first_name} {agent.last_name}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{agent.fields_count} field{agent.fields_count !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{agent.completed_count}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Harvested</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: agent.at_risk_count > 0 ? "#f59e0b" : "#9ca3af" }}>
            {agent.at_risk_count}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>At risk</div>
        </div>
      </div>
      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ height: "100%", width: `${perf}%`,
          background: perf >= 70 ? "#16a34a" : perf >= 40 ? "#f59e0b" : "#ef4444",
          borderRadius: 99, transition: "width 0.7s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: perf >= 70 ? "#16a34a" : "#f59e0b" }}>{perf}%</span>
      </div>
    </div>
  );
}

// ── Export Buttons ────────────────────────────────────────────────────────────
function exportCSV(fields: Field[]) {
  const header = "Field Name,Crop Type,Status,Stage,Location,Assigned Agent,Days Since Update,Planting Date";
  const rows = fields.map(f => [
    f.name, f.crop_type, f.status,
    f.latest_update?.stages ?? "—",
    "—",
    f.assigned_agent ? `${f.assigned_agent.first_name} ${f.assigned_agent.last_name}` : "Unassigned",
    f.days_since_update ?? "—",
    f.planting_date ? new Date(f.planting_date).toLocaleDateString() : "—",
  ].map(v => `"${v}"`).join(","));
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "fieldops-report.csv"; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(fields: Field[], agents: Agent[]) {
  const blob = new Blob([JSON.stringify({ fields, agents, exported_at: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "fieldops-report.json"; a.click();
  URL.revokeObjectURL(url);
}

function printPDF() { window.print(); }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [fields, setFields] = useState<Field[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = authHeader();
    Promise.all([
      axios.get(`${API}/api/fields/`, { headers: h }),
      axios.get(`${API}/api/agents/`, { headers: h }),
    ]).then(([f, a]) => { setFields(f.data); setAgents(a.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const total = fields.length;
  const completed = fields.filter(f => f.status === "completed").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgDays = fields.length > 0
    ? Math.round(fields.reduce((s, f) => s + (f.days_since_update ?? 0), 0) / fields.length)
    : 0;

  // Harvests by month
  const harvestByMonth: Record<string, number> = {};
  fields.forEach(f => {
    if (!f.latest_update || f.latest_update.stages !== "harvested") return;
    const d = new Date(f.latest_update.created_at);
    const key = MONTHS[d.getMonth()];
    harvestByMonth[key] = (harvestByMonth[key] ?? 0) + 1;
  });
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const m = MONTHS[d.getMonth()];
    return { month: m, count: harvestByMonth[m] ?? 0 };
  });

  // Stage distribution
  const stageCounts: Record<string, number> = { planted: 0, growing: 0, ready: 0, harvested: 0 };
  fields.forEach(f => {
    const s = f.latest_update?.stages;
    if (s && stageCounts[s] !== undefined) stageCounts[s]++;
  });

  // Activity timeline events
  const timelineEvents: TimelineEvent[] = fields
    .filter(f => f.latest_update)
    .sort((a, b) => new Date(b.latest_update!.created_at).getTime() - new Date(a.latest_update!.created_at).getTime())
    .slice(0, 6)
    .map(f => {
      const upd = f.latest_update!;
      const stage = upd.stages;
      const isAtRisk = f.status === "at_risk";
      const isHarvested = stage === "harvested";
      const isReady = stage === "ready";

      let label = "";
      let sub = "";
      let tag = "";
      let tagBg = "#f3f4f6";
      let tagColor = "#374151";
      let dotColor = "#9ca3af";

      if (isAtRisk) {
        label = `${f.name} flagged at risk`;
        sub = `${f.days_since_update} days since last update · ${f.crop_type}`;
        tag = "At Risk"; tagBg = "#fef9c3"; tagColor = "#854d0e"; dotColor = "#f59e0b";
      } else if (isHarvested) {
        label = `${f.name} harvested`;
        sub = `${timeAgo(upd.created_at)} · ${f.crop_type} · ${upd.updated_by_name}`;
        tag = "Harvested"; tagBg = "#f3f4f6"; tagColor = "#374151"; dotColor = "#16a34a";
      } else if (isReady) {
        label = `${f.name} reached ready`;
        sub = `${timeAgo(upd.created_at)} · ${f.crop_type} · ${upd.updated_by_name}`;
        tag = "Ready"; tagBg = "#dcfce7"; tagColor = "#15803d"; dotColor = "#3b82f6";
      } else {
        label = `${f.name} updated`;
        sub = `${timeAgo(upd.created_at)} · ${f.crop_type} · ${upd.updated_by_name}`;
        tag = stage.charAt(0).toUpperCase() + stage.slice(1);
        tagBg = "#eff6ff"; tagColor = "#1d4ed8"; dotColor = "#3b82f6";
      }

      return { label, sub, tag, tagBg, tagColor, dotColor };
    });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "inherit", color: "#9ca3af", fontSize: 14 }}>
      Loading report…
    </div>
  );

  return (
        
    <div style={{
    fontFamily: "'Syne', 'Segoe UI', sans-serif",
    background: "#f9fafb",
    minHeight: "100vh",
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    padding: "24px 48px 100px",
    boxSizing: "border-box",
    }}>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "#16a34a", marginBottom: 4 }}>FieldOps</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Reports</h1>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
          Season overview · {new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Top KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <KPICard value={total} label="Total fields" accent={false} />
        <KPICard value={`${completionRate}%`} label="Completion rate" accent={true} />
        <KPICard value={`${avgDays}d`} label="Avg days since update" accent={false} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>

        {/* Harvest bar chart */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "18px 16px",
          border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Harvests by month</span>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>
              {new Date().getFullYear() - 1}–{new Date().getFullYear()} season
            </span>
          </div>
          <HarvestBarChart data={last6Months} />
        </div>

        {/* Stage distribution */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "18px 16px",
          border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Stage distribution</span>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>Current snapshot</span>
          </div>
          <StageDistribution counts={stageCounts} />
        </div>
      </div>

      {/* Activity Timeline */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px",
        border: "1px solid #e5e7eb", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Activity timeline</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Recent field events</span>
        </div>
        <ActivityTimeline events={timelineEvents} />
      </div>

      {/* Agent Performance */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px",
        border: "1px solid #e5e7eb", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Agent performance</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Fields managed per agent</span>
        </div>
        {agents.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>No agents yet.</p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {agents.slice(0, 4).map(a => <AgentPerfCard key={a.id} agent={a} />)}
          </div>
        )}
      </div>

      {/* Export bar */}
<div style={{
  position: "fixed",
  bottom: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 900,
  background: "#fff",
  borderTop: "1px solid #e5e7eb",
  padding: "12px 48px",
  display: "flex",
  gap: 10,
  justifyContent: "center",
  zIndex: 20,
  boxSizing: "border-box",
}}>
        {[
          { label: "↓ Export CSV", icon: "↓", action: () => exportCSV(fields) },
          { label: "⎙ Export PDF", icon: "⎙", action: printPDF },
          { label: "⊞ Export JSON", icon: "⊞", action: () => exportJSON(fields, agents) },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ flex: 1, maxWidth: 180, padding: "11px 8px", fontSize: 13,
              fontFamily: "inherit", fontWeight: 600, background: "#f9fafb",
              color: "#374151", border: "1px solid #e5e7eb", borderRadius: 10,
              cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#86efac"; e.currentTarget.style.color = "#15803d"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ value, label, accent }: { value: string | number; label: string; accent: boolean }) {
  return (
    <div style={{ background: accent ? "#fff" : "#fff",
      border: accent ? "2px solid #16a34a" : "1px solid #e5e7eb",
      borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800,
        color: accent ? "#16a34a" : "#111827", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}