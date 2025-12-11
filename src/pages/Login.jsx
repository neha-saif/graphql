import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken, signIn } from "../lib/auth.js";

//handle signin form and submission
export default function Login() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
useEffect(() => {

  // add login-page class when login is mounted
  document.body.classList.add("login-page");

  // remove it when leaving the page
  return () => {
    document.body.classList.remove("login-page");
  };
}, []);

  async function handleLogin(e) {
    e.preventDefault();
    setOk("");
    setErr("");
    if (!identity || !password) {
      setErr("Please enter your username/email and password.");
      return;
    }
    setBusy(true);
    try {
const token = await signIn(identity, password);
saveToken(token)

      setOk("Welcome! Redirecting…");
console.log("Login success, navigating to /profile");
    navigate("/profile", { replace: true });
    } catch (e) {
      setErr(e?.message || "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  }

  const purple = "#a855f7";
  const purpleLight = "#c084fc";
  const bg = "#020617";
  const cardBg = "#020617";
  const border = "#1f2937";
  const textMain = "#e5e7eb";
  const textMuted = "#9ca3af";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle at top, #111827 0, ${bg} 55%, #000 100%)`,
        padding: "24px 12px",
      }}
    >
      <section
        className="card"
        style={{
          maxWidth: 420,
          width: "100%",
          margin: "0 auto",
          textAlign: "center",
          background: cardBg,
          borderRadius: 16,
          border: `1px solid ${border}`,
          boxShadow: "0 20px 55px rgba(15,23,42,0.9)",
          padding: "24px 24px 20px",
          color: textMain,
        }}
      >
        <h1
          style={{
            color: purple,
            marginBottom: "0.5rem",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Sign In
        </h1>
        <p
          style={{
            color: textMuted,
            fontSize: 13,
            marginBottom: "1.4rem",
          }}
        >
          Enter your credentials to access your profile dashboard.
        </p>

<form
  handleLogin={(e) => e.preventDefault()} // stop native submit
  noValidate
>
            <label
            htmlFor="identity"
            style={{
              display: "block",
              textAlign: "left",
              fontSize: 13,
              color: textMuted,
              marginBottom: 4,
            }}
          >
            Username or Email
          </label>
          <input
            id="identity"
            type="text"
            autoComplete="username email"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 12,
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              textAlign: "left",
              fontSize: 13,
              color: textMuted,
              marginBottom: 4,
            }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 16,
            }}
          />

          <button
  type="button"
    disabled={busy}
    onClick={handleLogin}  
                style={{
              width: "100%",
              marginTop: 4,
              padding: "10px 0",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(90deg, rgba(168,85,247,1), rgba(129,140,248,1))",
              color: "#f9fafb",
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          {err && (
            <div className="error" role= "alert" style={{ marginTop: 12 }}>
              {err}
            </div>
          )}
          {ok && (
            <div className="ok" style={{ marginTop: 12 }}>
              {ok}
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
