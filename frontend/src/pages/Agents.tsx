import { useState, useEffect } from "react";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Field {
  id: number;
  name: string;
  location: string;
  status: "active" | "at_risk" | "completed";
  latest_stage?: string;
}

interface Agent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  fields: Field[];
  fields_count: number;
  at_risk_count: number;
  completed_count: number;
  performance: number;
}

interface DashboardStats {
  total_agents: number;
  avg_fields_per_agent: number;
  at_risk_fields: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  
});
console.log("TOKEN:", localStorage.getItem("access"));
console.log("HEADERS:", authHeader());
// ── Stage badge ───────────────────────────────────────────────────────────────
const stageMeta: Record<string, { label: string; bg: string; color: string }> = {
  growing:   { label: "Growing",   bg: "#dcfce7", color: "#15803d" },
  planted:   { label: "Planted",   bg: "#eff6ff", color: "#1d4ed8" },
  ready:     { label: "Ready",     bg: "#f0fdf4", color: "#166534" },
  harvested: { label: "Harvested", bg: "#fef9c3", color: "#854d0e" },
  active:    { label: "Active",    bg: "#dcfce7", color: "#15803d" },
  at_risk:   { label: "At Risk",   bg: "#fef2f2", color: "#991b1b" },
  completed: { label: "Done",      bg: "#f3f4f6", color: "#374151" },
};

function StageBadge({ stage }: { stage: string }) {
  const m = stageMeta[stage?.toLowerCase()] ?? { label: stage, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
      background: m.bg, color: m.color, letterSpacing: "0.03em" }}>
      {m.label}
    </span>
  );
}

// ── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dcfce7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 14, color: "#15803d", flexShrink: 0, fontFamily: "monospace" }}>
      {first[0]}{last[0]}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent: string }) {
  return (
    <div style={{ background: "#fff", border: `2px solid ${accent}`, borderTop: `4px solid ${accent}`,
      borderRadius: 14, padding: "1.25rem 1.5rem", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
        color: "#9ca3af", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: Agent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "1.5rem", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar first={agent.first_name} last={agent.last_name} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
              {agent.first_name} {agent.last_name}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Field Agent</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%",
            background: agent.is_active ? "#16a34a" : "#d1d5db", display: "inline-block" }} />
          <span style={{ fontSize: 12, fontWeight: 600,
            color: agent.is_active ? "#15803d" : "#9ca3af" }}>
            {agent.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        background: "#f9fafb", borderRadius: 10, overflow: "hidden", border: "1px solid #f3f4f6" }}>
        {[
          { n: agent.fields_count, label: "Fields" },
          { n: agent.at_risk_count, label: "At risk", color: agent.at_risk_count > 0 ? "#ef4444" : undefined },
          { n: agent.completed_count, label: "Done" },
        ].map(({ n, label, color }) => (
          <div key={label} style={{ padding: "12px 0", textAlign: "center",
            borderRight: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "#111827" }}>{n}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Fields list */}
      {agent.fields.slice(0, expanded ? undefined : 3).map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "8px 0",
          borderBottom: "1px solid #f9fafb" }}>
          <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{f.name}</span>
          <StageBadge stage={f.latest_stage ?? f.status} />
        </div>
      ))}

      {agent.fields.length > 3 && (
        <button onClick={() => setExpanded((v) => !v)}
          style={{ background: "none", border: "none", color: "#16a34a", fontSize: 12,
            fontWeight: 600, cursor: "pointer", textAlign: "left", padding: 0 }}>
          {expanded ? "Show less ↑" : `+${agent.fields.length - 3} more fields ↓`}
        </button>
      )}

      {/* Performance bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Performance</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>
            {agent.performance}%
          </span>
        </div>
        <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${agent.performance}%`,
            background: agent.performance >= 75 ? "#16a34a" : agent.performance >= 40 ? "#f59e0b" : "#ef4444",
            borderRadius: 99, transition: "width 0.6s ease" }} />
        </div>
      </div>
    </div>
  );
}

// ── Add Agent Modal ───────────────────────────────────────────────────────────
function AddAgentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/agents/create/`, form, {
        headers: authHeader(),
      });
      console.log("TOKEN:", localStorage.getItem("access"));
console.log("HEADERS:", authHeader());
      setTempPassword(data.temp_password);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to create agent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "2rem",
        width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

        {tempPassword ? (
          // Success state — show temp password
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>✓</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
              Agent created!
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
              Share this temporary password with the agent. They should change it on first login.
            </p>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10,
              padding: "12px 16px", fontFamily: "monospace", fontSize: 18, fontWeight: 700,
              color: "#15803d", letterSpacing: "0.1em" }}>
              {tempPassword}
            </div>
            <button onClick={onClose} style={{ ...btnStyle, background: "#16a34a", color: "#fff", border: "none" }}>
              Done
            </button>
          </div>
        ) : (
          // Form state
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Add new agent</h2>
              <button onClick={onClose} style={{ background: "none", border: "none",
                fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ModalField label="First name">
                  <input style={inputStyle} name="first_name" placeholder="Jane"
                    value={form.first_name} onChange={handleChange} />
                </ModalField>
                <ModalField label="Last name">
                  <input style={inputStyle} name="last_name" placeholder="Waweru"
                    value={form.last_name} onChange={handleChange} />
                </ModalField>
              </div>
              <ModalField label="Work email">
                <input style={inputStyle} name="email" type="email"
                  placeholder="jane@company.co.ke"
                  value={form.email} onChange={handleChange} />
              </ModalField>

              {error && (
                <div style={{ padding: "10px 14px", background: "#fef2f2",
                  border: "1px solid #fca5a5", borderRadius: 8,
                  fontSize: 13, color: "#7f1d1d" }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={onClose}
                  style={{ ...btnStyle, flex: 1, background: "#f9fafb", color: "#374151" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ ...btnStyle, flex: 2, background: "#16a34a", color: "#fff",
                    border: "none", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Creating…" : "Create agent →"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
        textTransform: "uppercase", color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  fontSize: 14, fontFamily: "inherit", color: "#111827",
  background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 16px", fontSize: 13, fontFamily: "inherit",
  fontWeight: 600, border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AgentDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const isAdmin = localStorage.getItem("is_admin") === "true";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/agents/`, { headers: authHeader() }),
        axios.get(`${API_BASE}/api/agents/stats/`, { headers: authHeader() }),
      ]);
      setAgents(agentsRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to fetch agents", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = agents.filter((a) =>
    `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'Syne', 'Segoe UI', sans-serif", background: "#f9fafb",
      minHeight: "100vh", padding: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "#16a34a", marginBottom: 4 }}>
            FieldOps · Agent Management
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0 }}>
            Field Agents
          </h1>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
              background: "#16a34a", color: "#fff", border: "none", borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            + Add agent
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: "2rem" }}>
          <StatCard label="Total agents" value={stats.total_agents}
            sub="Active coordinators" accent="#16a34a" />
          <StatCard label="Avg fields/agent" value={stats.avg_fields_per_agent.toFixed(1)}
            sub="Field assignments" accent="#f59e0b" />
          <StatCard label="At-risk fields" value={stats.at_risk_fields}
            sub="Need attention" accent="#3b82f6" />
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: "1.5rem" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents by name or email…"
          style={{ width: "100%", maxWidth: 360, boxSizing: "border-box",
            padding: "9px 14px", fontSize: 14, fontFamily: "inherit",
            border: "1px solid #e5e7eb", borderRadius: 8, outline: "none",
            background: "#fff", color: "#111827" }} />
      </div>

      {/* Agent grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af", fontSize: 14 }}>
          Loading agents…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af", fontSize: 14 }}>
          {search ? "No agents match your search." : "No agents yet. Add one to get started."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddAgentModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}