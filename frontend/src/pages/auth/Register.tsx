import axios, { AxiosError } from "axios";
import { useState, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  otp: string;
  password: string;
}

interface ApiError {
  detail?: string;
  email?: string[];
  non_field_errors?: string[];
  [key: string]: unknown;
}

interface RegisterResponse {
  message: string;
  is_admin: boolean;
  tokens: { access: string; refresh: string };
  user: { id: number; email: string; first_name: string; last_name: string };
}

// ── Config ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "", color: "#e5e7eb" },
    { label: "Weak", color: "#ef4444" },
    { label: "Fair", color: "#f59e0b" },
    { label: "Good", color: "#10b981" },
    { label: "Strong", color: "#059669" },
  ];
  return { score, ...map[score] };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Register() {
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    otp: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Advance step tracker reactively
  useEffect(() => {
    if (otpSent && step < 2) setStep(2);
  }, [otpSent]);
  useEffect(() => {
    if (form.otp.length === 6 && step < 3) setStep(3);
  }, [form.otp]);
  useEffect(() => {
    if (form.password.length >= 8 && step < 4) setStep(4);
  }, [form.password]);

  // Countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [countdown]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
      showToast("Enter a valid email first.", "error");
      return;
    }
    setOtpSending(true);
    try {
      await axios.post(`${API_BASE}/api/auth/send-otp/`, { email: form.email });
      setOtpSent(true);
      setCountdown(60);
      showToast(`OTP sent to ${form.email}`, "success");
    } catch {
      showToast("Failed to send OTP. Try again.", "error");
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.otp || !form.password) {
      showToast("Please fill in all fields.", "error");
      return;
    }
    if (form.otp.length !== 6) { showToast("OTP must be 6 digits.", "error"); return; }
    if (form.password.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }

    setSubmitting(true);
    try {
      const { data } = await axios.post<RegisterResponse>(`${API_BASE}/api/auth/register/`, {
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        otp: form.otp,
        password: form.password,
      });

      // Persist tokens
      localStorage.setItem("access", data.tokens.access);
      localStorage.setItem("refresh", data.tokens.refresh);
      localStorage.setItem("is_admin", String(data.is_admin));

      showToast(
        data.is_admin
          ? "Welcome, Admin! Redirecting to dashboard…"
          : "Account created! Redirecting…",
        "success"
      );

      // Redirect after brief pause
      setTimeout(() => {
        window.location.href = data.is_admin ? "/admin/dashboard" : "/agent/dashboard";
      }, 1500);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const data = axiosErr.response?.data;
      const msg =
        data?.detail ??
        data?.email?.[0] ??
        data?.non_field_errors?.[0] ??
        "Registration failed. Please try again.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const strength = getStrength(form.password);

  const steps = [
    { n: 1, label: "Verify email" },
    { n: 2, label: "Enter OTP" },
    { n: 3, label: "Set password" },
    { n: 4, label: "Access granted" },
  ];

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <aside style={styles.aside}>
        <div style={styles.brand}>
          <div style={styles.logoBox}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="9" width="18" height="2" rx="1" fill="white" opacity="0.9" />
              <rect x="9" y="1" width="2" height="18" rx="1" fill="white" opacity="0.9" />
              <rect x="4" y="4" width="4" height="4" rx="1" fill="white" opacity="0.45" />
              <rect x="12" y="4" width="4" height="4" rx="1" fill="white" opacity="0.45" />
              <rect x="4" y="12" width="4" height="4" rx="1" fill="white" opacity="0.45" />
              <rect x="12" y="12" width="4" height="4" rx="1" fill="white" opacity="0.45" />
            </svg>
          </div>
          <div>
            <div style={styles.brandName}>FieldOps</div>
            <div style={styles.brandSub}>Field Management System</div>
          </div>
        </div>

        <nav style={styles.stepList}>
          {steps.map(({ n, label }) => {
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} style={styles.stepRow}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      ...styles.stepDot,
                      background: done ? "#dcfce7" : active ? "#16a34a" : "#f3f4f6",
                      border: done
                        ? "1.5px solid #16a34a"
                        : active
                        ? "1.5px solid #16a34a"
                        : "1.5px solid #d1d5db",
                      color: done ? "#15803d" : active ? "#fff" : "#9ca3af",
                    }}
                  >
                    {done ? "✓" : n}
                  </div>
                  {n < 4 && <div style={styles.stepLine} />}
                </div>
                <span
                  style={{
                    ...styles.stepLabel,
                    color: active ? "#111827" : done ? "#374151" : "#9ca3af",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </nav>

        <div style={styles.infoBox}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>⚑</div>
          <p style={styles.infoText}>
            <strong style={{ color: "#15803d" }}>First registrant becomes admin.</strong>{" "}
            The admin manages agents, zones, and all field assignments.
          </p>
        </div>
      </aside>

      {/* Main form */}
      <main style={styles.main}>
        <div style={styles.badge}>New account</div>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Join your field operations team</p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {/* Name row */}
          <div style={styles.row}>
            <Field label="First name">
              <input
                style={styles.input}
                name="firstName"
                type="text"
                placeholder="Jane"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Last name">
              <input
                style={styles.input}
                name="lastName"
                type="text"
                placeholder="Waweru"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
              />
            </Field>
          </div>

          {/* Email + OTP send */}
          <div style={styles.otpRow}>
            <Field label="Work email" style={{ flex: 1 }}>
              <input
                style={styles.input}
                name="email"
                type="email"
                placeholder="jane@company.co.ke"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </Field>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpSending || countdown > 0}
              style={{
                ...styles.otpBtn,
                opacity: otpSending || countdown > 0 ? 0.55 : 1,
                cursor: otpSending || countdown > 0 ? "not-allowed" : "pointer",
              }}
            >
              {otpSending ? "Sending…" : countdown > 0 ? `${countdown}s` : otpSent ? "Resend" : "Send OTP"}
            </button>
          </div>

          {/* OTP input */}
          <Field label="OTP code">
            <input
              style={{ ...styles.input, letterSpacing: "0.25em", fontFamily: "monospace" }}
              name="otp"
              type="text"
              placeholder="• • • • • •"
              value={form.otp}
              onChange={handleChange}
              maxLength={6}
              inputMode="numeric"
            />
          </Field>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>credentials</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Password */}
          <Field label="Password">
            <div style={{ position: "relative" }}>
              <input
                style={styles.input}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
            {form.password && (
              <div style={{ marginTop: 6 }}>
                <div style={styles.strengthTrack}>
                  <div
                    style={{
                      ...styles.strengthBar,
                      width: `${(strength.score / 4) * 100}%`,
                      background: strength.color,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>
                  {strength.label}
                </span>
              </div>
            )}
          </Field>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submit,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating account…" : "Create account →"}
          </button>

          {toast && (
            <div
              style={{
                ...styles.toast,
                background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${toast.type === "success" ? "#86efac" : "#fca5a5"}`,
                color: toast.type === "success" ? "#14532d" : "#7f1d1d",
              }}
            >
              {toast.msg}
            </div>
          )}

          <p style={styles.loginLink}>
            Already have an account?{" "}
            <a href="/login" style={styles.loginAnchor}>
              Sign in
            </a>
          </p>
        </form>
      </main>
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      <label style={fieldStyles.label}>{label}</label>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Syne', 'Segoe UI', sans-serif",
    background: "#f9fafb",
  },
  aside: {
    width: 260,
    flexShrink: 0,
    background: "#fff",
    borderRight: "1px solid #e5e7eb",
    padding: "2.5rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoBox: {
    width: 40,
    height: 40,
    background: "#16a34a",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: { fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#111827" },
  brandSub: { fontSize: 10, color: "#6b7280", letterSpacing: "0.04em", textTransform: "uppercase" },
  stepList: { display: "flex", flexDirection: "column", gap: 0 },
  stepRow: { display: "flex", alignItems: "flex-start", gap: 12, position: "relative", paddingBottom: 20 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    fontFamily: "monospace",
    zIndex: 1,
  },
  stepLine: {
    position: "absolute",
    left: 11,
    top: 24,
    width: 1,
    height: 20,
    background: "#e5e7eb",
  },
  stepLabel: { fontSize: 13, paddingTop: 3, lineHeight: 1.4 },
  infoBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "14px 16px",
    marginTop: "auto",
  },
  infoText: { fontSize: 12, color: "#374151", lineHeight: 1.6, margin: 0 },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    maxWidth: 480,
    margin: "0 auto",
    padding: "3rem 2rem",
  },
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
    marginBottom: 10,
  },
  title: { fontSize: 28, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
  subtitle: { fontSize: 14, color: "#6b7280", margin: "0 0 2rem" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  otpRow: { display: "flex", alignItems: "flex-end", gap: 10 },
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
  otpBtn: {
    flexShrink: 0,
    padding: "10px 14px",
    fontSize: 12,
    fontFamily: "inherit",
    fontWeight: 600,
    background: "transparent",
    color: "#15803d",
    border: "1px solid #86efac",
    borderRadius: 8,
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },
  divider: { display: "flex", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, background: "#f3f4f6" },
  dividerText: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace", letterSpacing: "0.06em" },
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
  strengthTrack: { height: 3, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" },
  strengthBar: { height: "100%", borderRadius: 99, transition: "width 0.3s, background 0.3s" },
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
    transition: "background 0.15s, transform 0.1s",
  },
  toast: {
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  loginLink: { textAlign: "center", fontSize: 13, color: "#6b7280", margin: 0 },
  loginAnchor: { color: "#16a34a", fontWeight: 600, textDecoration: "none" },
};

const fieldStyles: Record<string, React.CSSProperties> = {
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#6b7280",
  },
};