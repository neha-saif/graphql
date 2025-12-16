import React from "react";
import "../App.css";

export default function ProfileSummary({
  user,
  xpBase,
  auditRatio,
  xpUp,
  xpDown,
  level,
  totalGrade,
}) {
  if (!user) return null;

  // const XP_PER_LEVEL = Number(import.meta.env.VITE_XP_PER_LEVEL ?? 40000);

  const levelPctOf50 = Math.min(100, Math.round((level / 50) * 100));
  const auditRatioNum = Number(auditRatio || 0);
  const auditRatio1 = auditRatioNum.toFixed(1);
  const totalGrade1 = Number(totalGrade).toFixed(1);

  const purple = "#a855f7";
  const purpleLight = "#c084fc";
  const bgCard = "#020617";
  const border = "#1f2937";
  const textMain = "#e5e7eb";
  const textMuted = "#9ca3af";

  let auditColor = "#f97316"; // default orange if weird
  if (auditRatioNum >= 1) auditColor = "#22c55e"; // green
  else if (auditRatioNum >= 0.5) auditColor = "#eab308"; // amber
  else auditColor = "#ef4444"; // red

  return (
    <section
      className="card"
      style={{
        marginBottom: "1.5rem",
        textAlign: "center",
        padding: "1.75rem 2rem",
        background: bgCard,
        borderRadius: 16,
        border: `1px solid ${border}`,
        boxShadow: "0 18px 45px rgba(15,23,42,0.9)",
        color: textMain,
      }}
    >
      <h2
        style={{
          color: purple,
          marginBottom: "0.5rem",
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        Welcome to your dashboard, {user.firstName || user.login}!
      </h2>
      <p
        style={{
          marginBottom: "1.5rem",
          color: textMuted,
          fontSize: 14,
        }}
      >
        Here’s a quick overview of your levels, grades, and audit stats.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.9rem",
          textAlign: "left",
          fontSize: 14,
        }}
      >
        <div>
          <strong style={{ color: purpleLight }}>User Name:</strong>{" "}
          {user.login}
        </div>
        <div>
          <strong style={{ color: purpleLight }}>User ID:</strong> {user.id}
        </div>
        <div>
          <strong style={{ color: purpleLight }}>Level:</strong>{" "}
          {level ?? "—"}
        </div>
        <div>
          <strong style={{ color: purpleLight }}>Completion (to 50):</strong>{" "}
          {levelPctOf50}%
        </div>
        <div>
          <strong style={{ color: purpleLight }}>Total Grade:</strong>{" "}
          {totalGrade1}
        </div>
        <div>
          <strong style={{ color: purpleLight }}>Audit Ratio:</strong>{" "}
          <span
            style={{
              color: auditColor,
              fontWeight: 700,
            }}
          >
            {auditRatio1}
          </span>
        </div>
        <div>
          <strong style={{ color: purpleLight }}>XP Up:</strong>{" "}
          {xpUp?.toLocaleString() || 0}
        </div>
        <div>
          <strong style={{ color: purpleLight }}>XP Down:</strong>{" "}
          {xpDown?.toLocaleString() || 0}
        </div>
      </div>

      <div
        style={{
          background: "#111827",
          height: "10px",
          borderRadius: "999px",
          marginTop: "1.6rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${levelPctOf50}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(168,85,247,1), rgba(129,140,248,1))",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </section>
  );
}
