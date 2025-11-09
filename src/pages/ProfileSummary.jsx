import React from "react";
import "../App.css";

/**
 * Uses user.totalUp as the canonical XP for level.
 * Falls back to summed transactions if xpBase isn't available.
 *
 * Props:
 *   user: { id, login }
 *   xpBase: number    // from user.totalUp (preferred)
 *   xpFallback: number // sum of xpRows (fallback only)
 */
export default function ProfileSummary({ user, xpBase, xpFallback, auditRatio, xpUp, xpDown }) {
  if (!user) return null;

  // Prefer user.totalUp; fallback to summed transactions.
  const sourceXP = Number.isFinite(xpBase) && xpBase > 0 ? xpBase : (Number(xpFallback) || 0);

  // Tune per your platform. 40k per level gives you ~26 at totalUp ≈ 1,043,646.
  const XP_PER_LEVEL = Number(import.meta.env.VITE_XP_PER_LEVEL ?? 40000);

  const level = Math.floor(sourceXP / XP_PER_LEVEL);
  const levelPctOf50 = Math.min(100, Math.round((level / 50) * 100));

  return (
    
  <section
  className="card"
  style={{
    marginBottom: "1.5rem",
    textAlign: "center",
    padding: "1.5rem 2rem",
  }}
>
  <h2 style={{ color: "#6d28d9", marginBottom: "0.5rem" }}>
    Welcome to your dashboard, {user.firstName || user.login}!
  </h2>
  <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
    Here’s a quick look at your progress and audit stats.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "1rem",
      textAlign: "left",
    }}
  >
    <div><strong>User Name:</strong> {user.login}</div>
    <div><strong>User ID:</strong> {user.id}</div>
    <div><strong>Current Level:</strong> {level}</div>
    <div><strong>Course Progress:</strong> {levelPctOf50}%</div>
    
    <div>
      <strong>Audit Ratio:</strong>{" "}
      <span
        style={{
          color:
            auditRatio >= 1
              ? "#10b981"   
              : auditRatio >= 0.5
              ? "#facc15"  
              : "#ef4444",  
          fontWeight: 700,
        }}
      >
        {auditRatio}
      </span>
    </div>
    <div><strong>XP Up:</strong> {xpUp?.toLocaleString() || 0}</div>
    <div><strong>XP Down:</strong> {xpDown?.toLocaleString() || 0}</div>
  </div>

  <div
    style={{
      background: "#e5e7eb",
      height: "10px",
      borderRadius: "6px",
      marginTop: "1.5rem",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${levelPctOf50}%`,
        height: "100%",
        background: "linear-gradient(90deg, #6d28d9, #9333ea)",
        transition: "width 0.4s ease",
      }}
    />
  </div>
</section>

  );
}
