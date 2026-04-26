import axios, { AxiosError } from "axios";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LoginResponse {
  tokens: { access: string; refresh: string };
  is_admin: boolean;
  user: { id: number; email: string; first_name: string; last_name: string };
}

interface ApiError {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_BACKEND_URL ;

// ── Component ─────────────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post<LoginResponse>(`${API_BASE}/api/auth/login/`, {
        email,
        password,
      });

      // Persist tokens + role
      localStorage.setItem("access", data.tokens.access);
      localStorage.setItem("refresh", data.tokens.refresh);
      localStorage.setItem("is_admin", String(data.is_admin));
      localStorage.setItem("user", JSON.stringify(data.user));

      // Role-based redirect
      window.location.href = data.is_admin ? "/admin/dashboard" : "/agent/dashboard";
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const d = axiosErr.response?.data;
      setError(
        d?.detail ??
          d?.non_field_errors?.[0] ??
          "Invalid credentials. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Left decorative panel */}
      <div style={s.panel}>
        <div style={s.panelInner}>
          <div style={s.logoBox}>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="9" width="18" height="2" rx="1" fill="white" opacity="0.9" />
              <rect x="9" y="1" width="2" height="18" rx="1" fill="white" opacity="0.9" />
              <rect x="4" y="4" width="4" height="4" rx="1" fill="white" opacity="0.4" />
              <rect x="12" y="4" width="4" height="4" rx="1" fill="white" opacity="0.4" />
              <rect x="4" y="12" width="4" height="4" rx="1" fill="white" opacity="0.4" />
              <rect x="12" y="12" width="4" height="4" rx="1" fill="white" opacity="0.4" />
            </svg>
          </div>
          <h2 style={s.panelTitle}>FieldOps</h2>
          <p style={s.panelSub}>Field Management System</p>

          <div style={s.roleCards}>
            <RoleCard
              icon="⚙"
              title="Admin"
              desc="Manage agents, zones & assignments"
            />
            <RoleCard
              icon="◎"
              title="Agent"
              desc="View tasks and submit field reports"
            />
          </div>

          <p style={s.panelFooter}>
            You'll be directed to your dashboard based on your account role.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <main style={s.main}>
        <div style={s.formCard}>
          <div style={s.header}>
            <div style={s.badge}>Sign in</div>
            <h1 style={s.title}>Welcome back</h1>
            <p style={s.subtitle}>Enter your credentials to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form} noValidate>
            {/* Email */}
            <div style={s.field}>
              <label style={s.label}>Email address</label>
              <input
                style={s.input}
                type="email"
                placeholder="jane@company.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>

            {/* Password */}
            <div style={s.field}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={s.label}>Password</label>
                <a href="/forgot-password" style={s.forgotLink}>Forgot password?</a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  style={s.input}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={s.eyeBtn}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={s.errorBox}>
                <span style={{ fontSize: 14 }}>⚠</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...s.submit,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Signing in…" : "Sign in →"}
            </button>

            {/* Role hint */}
            <div style={s.roleHint}>
              <div style={s.hintRow}>
                <span style={{ ...s.rolePill, background: "#dcfce7", color: "#15803d" }}>Admin</span>
                <span style={s.hintText}>→ Agent management & zone control</span>
              </div>
              <div style={s.hintRow}>
                <span style={{ ...s.rolePill, background: "#eff6ff", color: "#1d4ed8" }}>Agent</span>
                <span style={s.hintText}>→ Field tasks & report submission</span>
              </div>
            </div>
          </form>

          <p style={s.registerLink}>
            No account yet?{" "}
            <a href="/register" style={s.registerAnchor}>
              Register here
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

// ── RoleCard sub-component ────────────────────────────────────────────────────
function RoleCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={s.roleCard}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={s.roleCardTitle}>{title}</div>
        <div style={s.roleCardDesc}>{desc}</div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Syne', 'Segoe UI', sans-serif",
    background: "#f9fafb",
  },
  panel: {
    width: 340,
    flexShrink: 0,
    background: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 2rem",
  },
  panelInner: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  logoBox: {
    width: 52,
    height: 52,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
    letterSpacing: "0.04em",
  },
  panelSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    margin: 0,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  roleCards: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
  },
  roleCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: "12px 14px",
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 2,
  },
  roleCardDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.4,
  },
  panelFooter: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.6,
    margin: 0,
    borderTop: "1px solid rgba(255,255,255,0.15)",
    paddingTop: "1rem",
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  formCard: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    padding: "2.5rem 2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: { display: "flex", flexDirection: "column", gap: 6 },
  badge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    padding: "3px 12px",
    borderRadius: 99,
    width: "fit-content",
  },
  title: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#111827",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
    lineHeight: 1,
  },
  forgotLink: {
    fontSize: 12,
    color: "#16a34a",
    textDecoration: "none",
    fontWeight: 500,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    fontSize: 13,
    color: "#7f1d1d",
    fontWeight: 500,
  },
  submit: {
    width: "100%",
    padding: 12,
    fontSize: 14,
    fontFamily: "inherit",
    fontWeight: 700,
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    transition: "background 0.15s",
  },
  roleHint: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "12px 14px",
    background: "#f9fafb",
    borderRadius: 8,
    border: "1px solid #f3f4f6",
  },
  hintRow: { display: "flex", alignItems: "center", gap: 10 },
  rolePill: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "2px 8px",
    borderRadius: 99,
    flexShrink: 0,
  },
  hintText: { fontSize: 12, color: "#6b7280" },
  registerLink: { textAlign: "center", fontSize: 13, color: "#6b7280", margin: 0 },
  registerAnchor: { color: "#16a34a", fontWeight: 600, textDecoration: "none" },
};