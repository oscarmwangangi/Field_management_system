import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logout from "../components/constants/logout"
const API = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
// const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access")}`,
  
});
// ── Types ─────────────────────────────────────────────────────────────────────
interface FieldUpdate {
  id: number;
  stages: string;
  notes: string;
  updated_by_name: string;
  created_at: string;
}
interface Field {
  id: number;
  name: string;
  location: string;
  crop_type: string;
  status: "active" | "at_risk" | "completed";
  planting_date: string | null;
  created_at: string;
  latest_update: FieldUpdate | null;
  days_since_update: number | null;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const timeAgo = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
};
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good day";
  return "Good evening";
};

// ── Meta ──────────────────────────────────────────────────────────────────────
const STAGE_META: Record<string, { label: string; bg: string; color: string }> = {
  planted:   { label: "Planted",   bg: "#eff6ff", color: "#1d4ed8" },
  growing:   { label: "Growing",   bg: "#dcfce7", color: "#15803d" },
  ready:     { label: "Ready",     bg: "#ecfdf5", color: "#065f46" },
  harvested: { label: "Harvested", bg: "#fef9c3", color: "#854d0e" },
};
const STATUS_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  active:    { label: "Active",    bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  at_risk:   { label: "At Risk",   bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  completed: { label: "Completed", bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
};

function StagePill({ val }: { val: string }) {
  const m = STAGE_META[val?.toLowerCase()] ?? { label: val, bg: "#f3f4f6", color: "#6b7280" };
  return <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>;
}
function StatusDot({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.active;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: m.bg, padding: "4px 12px", borderRadius: 99 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, display: "inline-block" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</span>
    </div>
  );
}

// ── Log Update Modal ──────────────────────────────────────────────────────────
function LogUpdateModal({ field, onClose, onSuccess }: { field: Field; onClose: () => void; onSuccess: () => void }) {
  const [stage, setStage] = useState(field.latest_update?.stages ?? "growing");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const computedRisk = (field.days_since_update ?? 0) > 7;

  const submit = async () => {
    if (!notes.trim()) { setError("Please add observation notes."); return; }
    setSaving(true); setError(null);
    try {
      await axios.post(`${API}/api/fields/${field.id}/updates/`, { stages: stage, notes }, { headers: authHeader() });
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "2rem",
        width: "100%", maxWidth: 560, boxShadow: "0 -20px 60px rgba(0,0,0,0.15)" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>Update logged!</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Update Field</h2>
                <button onClick={logout}>logout</button>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>{field.name} · {field.crop_type}</p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Lifecycle stage</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {["planted", "growing", "ready", "harvested"].map(s => (
                  <button key={s} onClick={() => setStage(s)}
                    style={{ flex: 1, padding: "9px 4px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                      border: stage === s ? "2px solid #16a34a" : "1.5px solid #e5e7eb",
                      borderRadius: 10, background: stage === s ? "#f0fdf4" : "#fff",
                      color: stage === s ? "#15803d" : "#9ca3af", cursor: "pointer", textTransform: "capitalize" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Computed status</label>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                <StatusDot status={computedRisk ? "at_risk" : "active"} />
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {computedRisk ? `No update logged in >${field.days_since_update} days` : `Last updated ${field.days_since_update ?? 0}d ago`}
                </span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Observation / notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. soil moisture good, no pest sightings, crop looks healthy…"
                style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "10px 12px",
                  fontSize: 14, fontFamily: "inherit", color: "#111827", background: "#f9fafb",
                  border: "1px solid #e5e7eb", borderRadius: 10, outline: "none",
                  minHeight: 90, resize: "vertical", lineHeight: 1.5 }} />
            </div>
            {error && <div style={{ padding: "9px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, color: "#7f1d1d", marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px", fontSize: 13, fontFamily: "inherit", fontWeight: 600, background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{ flex: 2, padding: "11px", fontSize: 13, fontFamily: "inherit", fontWeight: 700, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save update"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── New Assignment Banner ─────────────────────────────────────────────────────
function NewAssignmentBanner({ fields, onDismiss }: { fields: Field[]; onDismiss: () => void }) {
  if (fields.length === 0) return null;
  return (
    <div style={{ background: "linear-gradient(135deg, #1a3d2b 0%, #16a34a 100%)",
      borderRadius: 14, padding: "16px 20px", marginBottom: 20,
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 4px 24px rgba(22,163,74,0.25)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📋</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
          {fields.length === 1 ? `New field assigned: ${fields[0].name}` : `${fields.length} new fields assigned to you`}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
          Log your first update to acknowledge the assignment
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: "rgba(255,255,255,0.15)", border: "none",
        borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
        Dismiss
      </button>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
function ActivityFeed({ items }: { items: { field: string; stage: string; notes: string; when: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e5e7eb", marginTop: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Recent Activity</div>
      {items.map((u, i) => (
        <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < items.length - 1 ? 14 : 0,
          borderBottom: i < items.length - 1 ? "1px solid #f9fafb" : "none",
          marginBottom: i < items.length - 1 ? 14 : 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0fdf4",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🌿</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{u.field}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.notes || "Update logged"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <StagePill val={u.stage} />
            <span style={{ fontSize: 10, color: "#9ca3af" }}>{u.when}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Field Card ────────────────────────────────────────────────────────────────
function FieldCard({ field, onLogUpdate, isNew }: { field: Field; onLogUpdate: () => void; isNew: boolean }) {
  const isAtRisk = field.status === "at_risk";
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem",
      border: `1px solid ${isAtRisk ? "#fde68a" : "#e5e7eb"}`,
      borderLeft: `4px solid ${isAtRisk ? "#f59e0b" : isNew ? "#3b82f6" : "#e5e7eb"}`,
      transition: "box-shadow 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{field.name}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{field.crop_type}</div>
          </div>
          {isNew && <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>NEW</span>}
        </div>
        <StatusDot status={field.status} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <StagePill val={field.latest_update?.stages ?? "planted"} />
        {field.days_since_update != null && (
          <span style={{ fontSize: 11, color: "#9ca3af", background: "#f9fafb", border: "1px solid #f3f4f6", padding: "3px 10px", borderRadius: 99 }}>
            ⏱ {field.days_since_update === 0 ? "today" : `${field.days_since_update}d ago`}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>📍 {field.location}</div>
      {isAtRisk && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#854d0e", fontWeight: 500 }}>
          ⚠ No update in {field.days_since_update}+ days — log an update to clear this flag
        </div>
      )}
      <button onClick={onLogUpdate}
        style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
          background: "transparent", border: "1.5px dashed #86efac", borderRadius: 10,
          color: "#15803d", cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        + Log update
      </button>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ name, total, atRisk, active, done }: { name: string; total: number; atRisk: number; active: number; done: number }) {
  return (
    <div style={{ background: "#1a3d2b", borderRadius: 20, padding: "1.75rem 2rem",
      position: "relative", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ position: "absolute", right: -24, top: -24, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", right: 40, bottom: -36, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{greeting()}, {name}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>Your assigned field overview for today</div>
      <div style={{ display: "flex", gap: 10 }}>
        {[{ n: total, label: "Total", color: "#fff" }, { n: atRisk, label: "At Risk", color: "#fbbf24" }, { n: active, label: "Active", color: "#34d399" }, { n: done, label: "Done", color: "rgba(255,255,255,0.4)" }].map(({ n, label, color }) => (
          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{n}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AgentDashboard() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<Field | null>(null);
  const [tab, setTab] = useState<"all" | "active" | "at_risk" | "completed">("all");
  const [newFieldIds, setNewFieldIds] = useState<Set<number>>(new Set());
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") ?? "{}");

  const fetchFields = useCallback(async () => {
    try {
      const { data } = await axios.get<Field[]>(`${API}/api/fields/`, { headers: authHeader() });
      setFields(prev => {
        const prevIds = new Set(prev.map(f => f.id));
        const fresh = data.filter(f => !prevIds.has(f.id));
        if (fresh.length > 0) {
          setNewFieldIds(ids => new Set([...ids, ...fresh.map(f => f.id)]));
          setBannerDismissed(false);
        }
        return data;
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFields();
    const interval = setInterval(fetchFields, 60000);
    return () => clearInterval(interval);
  }, [fetchFields]);

  const total    = fields.length;
  const atRisk   = fields.filter(f => f.status === "at_risk").length;
  const active   = fields.filter(f => f.status === "active").length;
  const done     = fields.filter(f => f.status === "completed").length;
  const displayed = fields.filter(f => tab === "all" || f.status === tab);
  const newFields = fields.filter(f => newFieldIds.has(f.id));

  const recentActivity = fields
    .filter(f => f.latest_update)
    .sort((a, b) => new Date(b.latest_update!.created_at).getTime() - new Date(a.latest_update!.created_at).getTime())
    .slice(0, 5)
    .map(f => ({ field: f.name, stage: f.latest_update!.stages, notes: f.latest_update!.notes, when: timeAgo(f.latest_update!.created_at) }));

  const atRiskFields  = displayed.filter(f => f.status === "at_risk");
  const activeFields  = displayed.filter(f => f.status === "active");
  const doneFields    = displayed.filter(f => f.status === "completed");

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "inherit", color: "#9ca3af" }}>
      Loading your fields…
    </div>
  );

  return (
    <div style={{ fontFamily: "'Syne', 'Segoe UI', sans-serif", background: "#f3f4f6", minHeight: "100vh", padding: "20px 16px", maxWidth: 1200, margin: "0 auto" }}>

      <Hero name={user.first_name ?? "Agent"} total={total} atRisk={atRisk} active={active} done={done} />

      {!bannerDismissed && newFields.length > 0 && (
        <NewAssignmentBanner fields={newFields} onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#fff", borderRadius: 12, padding: 5, border: "1px solid #e5e7eb" }}>
        {(["all", "active", "at_risk", "completed"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "7px 4px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              border: "none", borderRadius: 8, cursor: "pointer",
              background: tab === t ? "#1a3d2b" : "transparent",
              color: tab === t ? "#fff" : "#9ca3af", transition: "all 0.15s",
              textTransform: "capitalize", whiteSpace: "nowrap" }}>
            {t === "at_risk" ? "At Risk" : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "at_risk" && atRisk > 0 && (
              <span style={{ marginLeft: 4, background: "#f59e0b", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 5px" }}>{atRisk}</span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#9ca3af", background: "#fff", borderRadius: 16 }}>
          {tab === "all" ? "No fields assigned yet." : `No ${tab.replace("_", " ")} fields.`}
        </div>
      ) : (
        <>
          {atRiskFields.length > 0 && (
            <Section icon="⚠" label="At risk — needs attention" labelColor="#b45309">
              {atRiskFields.map(f => <FieldCard key={f.id} field={f} onLogUpdate={() => setActiveModal(f)} isNew={newFieldIds.has(f.id)} />)}
            </Section>
          )}
          {activeFields.length > 0 && (
            <Section icon="✓" label="Active fields" labelColor="#15803d">
              {activeFields.map(f => <FieldCard key={f.id} field={f} onLogUpdate={() => setActiveModal(f)} isNew={newFieldIds.has(f.id)} />)}
            </Section>
          )}
          {doneFields.length > 0 && (
            <div style={{ opacity: 0.7 }}>
              <Section icon="🏁" label="Completed" labelColor="#6b7280">
                {doneFields.map(f => <FieldCard key={f.id} field={f} onLogUpdate={() => setActiveModal(f)} isNew={false} />)}
              </Section>
            </div>
          )}
        </>
      )}

      <ActivityFeed items={recentActivity} />

      {activeModal && (
        <LogUpdateModal field={activeModal} onClose={() => setActiveModal(null)}
          onSuccess={() => { fetchFields(); setNewFieldIds(new Set()); }} />
      )}
    </div>
  );
}

function Section({ icon, label, labelColor, children }: { icon: string; label: string; labelColor: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: labelColor }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#6b7280" };