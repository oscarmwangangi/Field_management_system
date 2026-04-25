import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  
});
// ── Types ─────────────────────────────────────────────────────────────────────
interface Field {
  id: number;
  name: string;
  crop_type: string;
  planting_date: string | null;
  status: "active" | "at_risk" | "completed";
  assigned_agent: { first_name: string; last_name: string } | null;
  latest_update: { stages: string } | null;
}
interface Agent { id: number; first_name: string; last_name: string; fields_count: number; at_risk_count: number; }


// ── Mini SVG Charts ───────────────────────────────────────────────────────────

function DonutChart({ active, atRisk, completed }: { active: number; atRisk: number; completed: number }) {
  const total = active + atRisk + completed || 1;
  const pct = (n: number) => (n / total) * 100;
  const a = pct(active), r = pct(atRisk), c = pct(completed);

  // SVG donut via stroke-dasharray
  const R = 54, circ = 2 * Math.PI * R;
  const seg = (pct: number) => (pct / 100) * circ;

  let offset = 0;
  const segments = [
    { pct: a, color: "#16a34a", label: "Active" },
    { pct: r, color: "#f59e0b", label: "At Risk" },
    { pct: c, color: "#9ca3af", label: "Completed" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          {segments.map((s, i) => {
            const dash = seg(s.pct);
            const gap = circ - dash;
            const rot = (offset / 100) * 360 - 90;
            offset += s.pct;
            return (
              <circle key={i} cx="70" cy="70" r={R} fill="none"
                stroke={s.color} strokeWidth="18"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={0}
                transform={`rotate(${rot} 70 70)`}
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{Math.round(a)}%</span>
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>active</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginLeft: "auto" }}>{Math.round(s.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; active: number; atRisk: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.active, d.atRisk]), 1);
  const H = 100;
  const barW = 14, gap = 6, groupGap = 20;
  const totalW = data.length * (barW * 2 + gap + groupGap);

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${H + 30}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1="0" y1={H - t * H} x2={totalW} y2={H - t * H} stroke="#f3f4f6" strokeWidth="1" />
          <text x="-2" y={H - t * H + 4} fontSize="9" fill="#9ca3af" textAnchor="end">
            {Math.round(t * max)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = i * (barW * 2 + gap + groupGap) + groupGap / 2;
        const ah = (d.active / max) * H;
        const rh = (d.atRisk / max) * H;
        return (
          <g key={d.label}>
            <rect x={x} y={H - ah} width={barW} height={ah} rx="3" fill="#16a34a" opacity="0.85" />
            <rect x={x + barW + gap} y={H - rh} width={barW} height={rh} rx="3" fill="#f59e0b" opacity="0.85" />
            <text x={x + barW + gap / 2} y={H + 16} fontSize="9" fill="#9ca3af" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 400, H = 90, pad = 30;
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - (d.value / max) * (H - 10),
    ...d,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${H + 5} L ${pts[0].x} ${H + 5} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 25}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={pad} y1={H - t * (H - 10)} x2={W - pad} y2={H - t * (H - 10)}
          stroke="#f3f4f6" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#lineGrad)" />
      <path d={path} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#16a34a" strokeWidth="2" />
          <text x={p.x} y={H + 18} fontSize="9" fill="#9ca3af" textAnchor="middle">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, bg  }: { label: string; value: number; icon: string; bg: string; color: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 0,
      display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
    </div>
  );
}

// ── Stage badge ───────────────────────────────────────────────────────────────
const stageBg: Record<string, [string, string]> = {
  growing:   ["#dcfce7", "#15803d"],
  planted:   ["#eff6ff", "#1d4ed8"],
  ready:     ["#f0fdf4", "#166534"],
  harvested: ["#fef9c3", "#854d0e"],
  active:    ["#dcfce7", "#15803d"],
  at_risk:   ["#fef9c3", "#854d0e"],
  completed: ["#f3f4f6", "#374151"],
};

function StagePill({ val }: { val: string }) {
  const [bg, color] = stageBg[val?.toLowerCase()] ?? ["#f3f4f6", "#6b7280"];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: bg, color, textTransform: "capitalize" }}>{val}</span>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [fields, setFields] = useState<Field[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [tab, setTab] = useState<"all" | "active" | "at_risk" | "completed">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = authHeader();
    Promise.all([
      axios.get(`${API}/api/fields/`, { headers }),
      axios.get(`${API}/api/agents/`, { headers }),
      axios.get(`${API}/api/agents/stats/`, { headers }),
    ]).then(([f, a]) => {
      setFields(f.data);
      setAgents(a.data);
 
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derived stats
  const total = fields.length;
  const active = fields.filter(f => f.status === "active").length;
  const atRisk = fields.filter(f => f.status === "at_risk").length;
  const completed = fields.filter(f => f.status === "completed").length;

  // Crop breakdown for bar chart
  const cropMap: Record<string, { active: number; atRisk: number }> = {};
  fields.forEach(f => {
    const c = f.crop_type || "Other";
    if (!cropMap[c]) cropMap[c] = { active: 0, atRisk: 0 };
    if (f.status === "active") cropMap[c].active++;
    if (f.status === "at_risk") cropMap[c].atRisk++;
  });
  const cropData = Object.entries(cropMap).slice(0, 5).map(([label, v]) => ({ label, ...v }));

  // Monthly field creation for line chart
  const monthMap: Record<string, number> = {};
  fields.forEach(f => {
    if (!f.planting_date) return;
    const d = new Date(f.planting_date);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthMap[key] = (monthMap[key] ?? 0) + 1;
  });
  const lineData = Object.entries(monthMap).slice(-7).map(([label, value]) => ({ label, value }));

  // Filtered table (top 5)
  const tableFields = fields
    .filter(f => tab === "all" || f.status === tab)
    .slice(0, 5);

  const user = JSON.parse(localStorage.getItem("user") ?? "{}");

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "inherit", color: "#9ca3af", fontSize: 14 }}>
      Loading dashboard…
    </div>
  );

  return (
    <div style={{ fontFamily: "'Syne', 'Segoe UI', sans-serif", background: "#f3f4f6",
      minHeight: "100vh", padding: "0" }}>

      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10,
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
          padding: "7px 14px", width: 220 }}>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>🔍</span>
          <input placeholder="Search" style={{ border: "none", outline: "none", background: "transparent",
            fontSize: 13, color: "#374151", width: "100%", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>🔔</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1a3d2b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              {user.first_name ?? "Admin"} ▾
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px" }}>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Fields"     value={total}     icon="⊞" bg="#1a3d2b" color="#fff" />
          <StatCard label="Active Fields"    value={active}    icon="▲" bg="#16a34a" color="#fff" />
          <StatCard label="At Risk Fields"   value={atRisk}    icon="◎" bg="#f59e0b" color="#fff" />
          <StatCard label="Completed Fields" value={completed} icon="≡" bg="#e5e7eb" color="#374151" />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* Donut + Bar */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Field Status</div>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <DonutChart active={active} atRisk={atRisk} completed={completed} />
              {cropData.length > 0 && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <BarChart data={cropData} />
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
                    {[["#16a34a", "Active"], ["#f59e0b", "At Risk"]].map(([c, l]) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line chart */}
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Field Overview</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>Fields planted by month</div>
            {lineData.length >= 2
              ? <LineChart data={lineData} />
              : <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#d1d5db", fontSize: 13 }}>Not enough data yet</div>
            }
          </div>
        </div>

        {/* Agent mini cards */}
        {agents.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "20px",
            border: "1px solid #e5e7eb", marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>
              Agent Overview <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>— top {Math.min(agents.length, 4)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {agents.slice(0, 4).map(a => (
                <div key={a.id} style={{ background: "#f9fafb", borderRadius: 10,
                  padding: "12px 14px", border: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#dcfce7",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#15803d" }}>
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                      {a.first_name} {a.last_name}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>Fields</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{a.fields_count}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>At Risk</span>
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: a.at_risk_count > 0 ? "#f59e0b" : "#9ca3af" }}>{a.at_risk_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Field Directory</div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f3f4f6",
            borderRadius: 8, padding: 4, width: "fit-content" }}>
            {(["all", "active", "at_risk", "completed"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  background: tab === t ? "#1a3d2b" : "transparent",
                  color: tab === t ? "#fff" : "#6b7280", textTransform: "capitalize",
                  transition: "all 0.15s" }}>
                {t === "at_risk" ? "At Risk" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #f3f4f6" }}>
                  {["Field Name", "Crop Type", "Planting Date", "Assigned Agent", "Stage", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11,
                      fontWeight: 700, color: "#9ca3af", letterSpacing: "0.05em",
                      textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableFields.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No fields found.</td></tr>
                ) : tableFields.map(f => (
                  <tr key={f.id} style={{ borderBottom: "1px solid #f9fafb" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>{f.name}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{f.crop_type}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>
                      {f.planting_date ? new Date(f.planting_date).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
                      {f.assigned_agent ? `${f.assigned_agent.first_name} ${f.assigned_agent.last_name}` : <span style={{ color: "#d1d5db", fontStyle: "italic" }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StagePill val={f.latest_update?.stages ?? "planted"} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StagePill val={f.status} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a href={`/admin/fields/${f.id}`}
                          style={{ fontSize: 11, fontWeight: 600, color: "#16a34a",
                            textDecoration: "none", padding: "3px 10px",
                            border: "1px solid #86efac", borderRadius: 6 }}>View</a>
                        <a href={`/admin/fields/${f.id}/edit`}
                          style={{ fontSize: 11, fontWeight: 600, color: "#374151",
                            textDecoration: "none", padding: "3px 10px",
                            border: "1px solid #e5e7eb", borderRadius: 6 }}>Update</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Showing top 5 of {fields.filter(f => tab === "all" || f.status === tab).length} fields
            </span>
            <a href="/admin/fields" style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", textDecoration: "none" }}>
              View all →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}