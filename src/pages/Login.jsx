import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, saveToken, decodeJwtPayload } from "../lib/auth.js";

//handle signin form and submission
export default function Login() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setOk(""); setErr("");
    if (!identity || !password) {
      setErr("Please enter your username/email and password.");
      return;
    }
    setBusy(true);
    try {
      const token = await signIn(identity, password);
      saveToken(token);

      const payload = decodeJwtPayload(token) || {};
      const claims  = payload["https://hasura.io/jwt/claims"] || {};
      const who = claims["x-hasura-user-id"]
        ? `user #${claims["x-hasura-user-id"]}`
        : (payload.login ?? "");

      setOk(`Welcome${who ? ", " + who : ""}! Redirecting…`);
      setTimeout(() => navigate("/profile"), 600);
    } catch (e) {
      setErr(e?.message || "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
   <main
  className="card"
  style={{
    maxWidth: 400,
    margin: "5vh auto",
    textAlign: "center",
  }}
>
  <h1 style={{ color: "#6d28d9", marginBottom: "0.5rem" }}>Sign In</h1>
  <p style={{ fontSize: 14, marginBottom: 24 }}>
    Use <strong>username</strong> or <strong>email</strong> to login
  </p>

  <form onSubmit={onSubmit} noValidate>
    <label htmlFor="identity" style={{ display: "block", textAlign: "left" }}>
      Username or Email
    </label>
        <input
          id="identity"
          type="text"
          autoComplete="username email"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          required
        />

 <label htmlFor="password" style={{ display: "block", textAlign: "left" }}>
      Password
    </label>
            <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

    <button disabled={busy} style={{ width: "100%", marginTop: 12 }}>
      {busy ? "Signing in…" : "Sign in"}
    </button>

        {err && <div className="error">{err}</div>}
    {ok && <div className="ok">{ok}</div>}
  </form>
    </main>
  );
}
