import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// ── Config ────────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
// const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });
const isAdmin = () => localStorage.getItem("is_admin") === "true";
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  
});
// ── Types ─────────────────────────────────────────────────────────────────────
interface Agent { id: number; first_name: string; last_name: string; email: string; }
interface FieldUpdate { id: number; stages: string; notes: string; updated_by_name: string; created_at: string; }
interface Field {
  id: number;
  name: string;
  location: string;
  crop_type: string;
  status: "active" | "at_risk" | "completed";
  planting_date: string | null;
  created_at: string;
  assigned_agent: Agent | null;
  latest_update: FieldUpdate | null;
  days_since_update: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusMeta = {
  active:    { label: "Active",    bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  at_risk:   { label: "At Risk",   bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  completed: { label: "Completed", bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
};
const stageMeta: Record<string, { label: string; bg: string; color: string }> = {
  planted:   { label: "Planted",   bg: "#eff6ff", color: "#1d4ed8" },
  growing:   { label: "Growing",   bg: "#dcfce7", color: "#15803d" },
  ready:     { label: "Ready",     bg: "#f0fdf4", color: "#166534" },
  harvested: { label: "Harvested", bg: "#fef9c3", color: "#854d0e" },
};

function Badge({ val, map }: { val: string; map: Record<string, { label: string; bg: string; color: string }> }) {
  const m = map[val?.toLowerCase()] ?? { label: val, bg: "#f3f4f6", color: "#6b7280" };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: m.bg, color: m.color, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{m.label}</span>;
}

function Avatar({ first, last, size = 36 }: { first: string; last: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.33, color: "#15803d", flexShrink: 0, fontFamily: "monospace" }}>
      {first?.[0]}{last?.[0]}
    </div>
  );
}

// ── Create Field Modal ────────────────────────────────────────────────────────
function CreateFieldModal({ agents, onClose, onSuccess }: { agents: Agent[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", location: "", crop_type: "", planting_date: "", assigned_agent: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.crop_type) { setError("Name, location and crop type are required."); return; }
    setSaving(true); setError(null);
    try {
      await axios.post(`${API}/api/fields/`, { ...form, assigned_agent: form.assigned_agent || null }, { headers: authHeader() });
      onSuccess(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Failed to create field.");
    } finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Create New Field" subtitle="Add a field to the system" onClose={onClose}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MF label="Field name"><input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Kiambu North Block" /></MF>
            <MF label="Location"><input style={inp} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Kiambu County" /></MF>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MF label="Crop type"><input style={inp} value={form.crop_type} onChange={e => setForm(p => ({ ...p, crop_type: e.target.value }))} placeholder="Maize" /></MF>
            <MF label="Planting date"><input style={inp} type="date" value={form.planting_date} onChange={e => setForm(p => ({ ...p, planting_date: e.target.value }))} /></MF>
          </div>
          <MF label="Assign agent (optional)">
            <select style={inp} value={form.assigned_agent} onChange={e => setForm(p => ({ ...p, assigned_agent: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </MF>
          {error && <ErrBox msg={error} />}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Creating…" : "Create field →"}</button>
          </div>
        </form>
      </ModalCard>
    </Overlay>
  );
}

// ── Assign Agent Modal ────────────────────────────────────────────────────────
function AssignModal({ field, agents, onClose, onSuccess }: { field: Field; agents: Agent[]; onClose: () => void; onSuccess: () => void }) {
  const [agentId, setAgentId] = useState(field.assigned_agent?.id?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/api/fields/${field.id}/assign/`, { assigned_agent: agentId || null }, { headers: authHeader() });
      onSuccess(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Assign Agent" subtitle={`${field.name} · ${field.crop_type}`} onClose={onClose}>
        <MF label="Select agent">
          <select style={inp} value={agentId} onChange={e => setAgentId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.email})</option>)}
          </select>
        </MF>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Assign →"}</button>
        </div>
      </ModalCard>
    </Overlay>
  );
}

// ── Log Update Modal ──────────────────────────────────────────────────────────
function LogUpdateModal({ field, onClose, onSuccess }: { field: Field; onClose: () => void; onSuccess: () => void }) {
  const [stage, setStage] = useState(field.latest_update?.stages ?? "growing");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stages = ["planted", "growing", "ready", "harvested"];
  const computedStatus = field.days_since_update != null && field.days_since_update > 7 ? "at_risk" : "active";

  const submit = async () => {
    if (!notes.trim()) { setError("Please add observation notes."); return; }
    setSaving(true); setError(null);
    try {
      await axios.post(`${API}/api/fields/${field.id}/updates/`, { stages: stage, notes }, { headers: authHeader() });
      onSuccess(); onClose();
    } catch { setError("Failed to save update."); } finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Update Field" subtitle={`${field.name} · ${field.crop_type}`} onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MF label="Lifecycle stage">
            <div style={{ display: "flex", gap: 8 }}>
              {stages.map(s => (
                <button key={s} type="button" onClick={() => setStage(s)}
                  style={{ flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    border: stage === s ? "2px solid #16a34a" : "1.5px solid #e5e7eb",
                    borderRadius: 8, background: stage === s ? "#f0fdf4" : "#fff",
                    color: stage === s ? "#15803d" : "#6b7280", cursor: "pointer", textTransform: "capitalize" }}>
                  {s}
                </button>
              ))}
            </div>
          </MF>
          <MF label="Computed status">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Badge val={computedStatus} map={statusMeta} />
              {field.days_since_update != null && (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {field.days_since_update > 7 ? `No update logged in >${field.days_since_update} days` : `Last updated ${field.days_since_update}d ago`}
                </span>
              )}
            </div>
          </MF>
          <MF label="Observation / notes">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Enter field notes…"
              style={{ ...inp, minHeight: 100, resize: "vertical", lineHeight: 1.5 }} />
          </MF>
          {error && <ErrBox msg={error} />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </ModalCard>
    </Overlay>
  );
}

// ── Field Card ────────────────────────────────────────────────────────────────
function FieldCard({ field, agents, onRefresh }: { field: Field; agents: Agent[]; onRefresh: () => void }) {
  const [modal, setModal] = useState<"assign" | "update" | null>(null);
  const isAtRisk = field.status === "at_risk";

  return (
    <div style={{ background: "#fff", border: `1px solid ${isAtRisk ? "#fde68a" : "#e5e7eb"}`,
      borderTop: `4px solid ${isAtRisk ? "#f59e0b" : "#e5e7eb"}`,
      borderRadius: 14, padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{field.name}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{field.crop_type}</div>
        </div>
        <Badge val={field.status} map={statusMeta} />
      </div>

      {/* Stage + time */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {field.latest_update && <Badge val={field.latest_update.stages} map={stageMeta} />}
        {field.days_since_update != null && (
          <span style={{ fontSize: 11, color: "#9ca3af", background: "#f9fafb",
            border: "1px solid #f3f4f6", padding: "2px 8px", borderRadius: 99 }}>
            ⏱ {field.days_since_update}d ago
          </span>
        )}
      </div>

      {/* Location */}
      <div style={{ fontSize: 12, color: "#6b7280" }}>📍 {field.location}</div>

      {/* Agent */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
        {field.assigned_agent ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar first={field.assigned_agent.first_name} last={field.assigned_agent.last_name} size={28} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
              {field.assigned_agent.first_name} {field.assigned_agent.last_name}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Unassigned</span>
        )}
        {isAdmin() && (
          <button onClick={() => setModal("assign")}
            style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", background: "none",
              border: "none", cursor: "pointer", padding: 0 }}>
            {field.assigned_agent ? "Reassign" : "Assign"} →
          </button>
        )}
      </div>

      {/* Log update button */}
      <button onClick={() => setModal("update")}
        style={{ width: "100%", padding: "9px", fontSize: 13, fontWeight: 600,
          fontFamily: "inherit", background: "transparent",
          border: "1.5px dashed #86efac", borderRadius: 8,
          color: "#15803d", cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        + Log update
      </button>

      {modal === "assign" && <AssignModal field={field} agents={agents} onClose={() => setModal(null)} onSuccess={onRefresh} />}
      {modal === "update" && <LogUpdateModal field={field} onClose={() => setModal(null)} onSuccess={onRefresh} />}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ total, atRisk, active, done }: { total: number; atRisk: number; active: number; done: number }) {
  return (
    <div style={{ background: "#1a3d2b", borderRadius: 16, padding: "1.75rem 2rem",
      position: "relative", overflow: "hidden", marginBottom: "1.5rem" }}>
      <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120,
        borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", right: 40, bottom: -30, width: 80, height: 80,
        borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 4 }}>All Fields</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>Complete field inventory</div>
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { n: total, label: "Total", color: "#fff" },
          { n: atRisk, label: "At Risk", color: "#fbbf24" },
          { n: active, label: "Active", color: "#34d399" },
          { n: done, label: "Done", color: "rgba(255,255,255,0.4)" },
        ].map(({ n, label, color }) => (
          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{n}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      {atRisk > 0 && (
        <div style={{ marginTop: 14, background: "#fef9c3", borderRadius: 8,
          padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#854d0e" }}>
            {atRisk} field{atRisk > 1 ? "s" : ""} at risk
          </span>
          <span style={{ fontSize: 12, color: "#92400e" }}>— no update logged in over 7 days</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Fields() {
  const [fields, setFields] = useState<Field[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "at_risk" | "completed">("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, aRes] = await Promise.all([
        axios.get(`${API}/api/fields/`, { headers: authHeader() }),
        axios.get(`${API}/api/agents/`, { headers: authHeader() }),
      ]);
      setFields(fRes.data);
      setAgents(aRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayed = fields
    .filter(f => filter === "all" || f.status === filter)
    .filter(f => `${f.name} ${f.location} ${f.crop_type}`.toLowerCase().includes(search.toLowerCase()));

  const total = fields.length;
  const atRisk = fields.filter(f => f.status === "at_risk").length;
  const active = fields.filter(f => f.status === "active").length;
  const done = fields.filter(f => f.status === "completed").length;

  return (
    <div style={{ fontFamily: "'Syne', 'Segoe UI', sans-serif", background: "#f9fafb",
      minHeight: "100vh", padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "#16a34a", marginBottom: 4 }}>FieldOps · Admin</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0 }}>Field Management</h1>
        </div>
        {isAdmin() && (
          <button onClick={() => setShowCreate(true)}
            style={{ padding: "10px 18px", background: "#16a34a", color: "#fff", border: "none",
              borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            + New field
          </button>
        )}
      </div>

      {/* Summary */}
      <SummaryCard total={total} atRisk={atRisk} active={active} done={done} />

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {(["all", "active", "at_risk", "completed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              border: filter === f ? "1.5px solid #16a34a" : "1.5px solid #e5e7eb",
              borderRadius: 99, background: filter === f ? "#f0fdf4" : "#fff",
              color: filter === f ? "#15803d" : "#6b7280", cursor: "pointer",
              textTransform: "capitalize" }}>
            {f === "all" ? "All" : f === "at_risk" ? "At Risk" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search fields…"
          style={{ marginLeft: "auto", padding: "7px 14px", fontSize: 13, fontFamily: "inherit",
            border: "1.5px solid #e5e7eb", borderRadius: 99, outline: "none",
            background: "#fff", color: "#111827", width: 200 }} />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af" }}>Loading fields…</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af" }}>
          {search || filter !== "all" ? "No fields match your filter." : "No fields yet. Create one to get started."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {displayed.map(f => <FieldCard key={f.id} field={f} agents={agents} onRefresh={fetchAll} />)}
        </div>
      )}

      {showCreate && <CreateFieldModal agents={agents} onClose={() => setShowCreate(false)} onSuccess={fetchAll} />}
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
      {children}
    </div>
  );
}

function ModalCard({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "2rem", width: "100%",
      maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>{subtitle}</p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22,
          cursor: "pointer", color: "#9ca3af", lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {children}
    </div>
  );
}

function MF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#6b7280", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, color: "#7f1d1d" }}>{msg}</div>;
}

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 14,
  fontFamily: "inherit", color: "#111827", background: "#fff",
  border: "1px solid #d1d5db", borderRadius: 8, outline: "none",
};
const cancelBtn: React.CSSProperties = {
  flex: 1, padding: "10px", fontSize: 13, fontFamily: "inherit", fontWeight: 600,
  background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
};
const saveBtn: React.CSSProperties = {
  flex: 2, padding: "10px", fontSize: 13, fontFamily: "inherit", fontWeight: 700,
  background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};