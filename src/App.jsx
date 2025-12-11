import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { getToken } from "./lib/auth.js";

export default function App() {
  const hasToken = !!getToken(); // read from localStorage on every render

  return (
    <Routes>
      {/* Root: decide where to go based on token */}
      <Route
        path="/"
        element={
          hasToken ? (
            <Navigate to="/profile" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Login: if already logged in, bounce to profile */}
      <Route
        path="/login"
        element={hasToken ? <Navigate to="/profile" replace /> : <Login />}
      />

      {/* Profile: if not logged in, bounce to login */}
      <Route
        path="/profile"
        element={hasToken ? <Profile /> : <Navigate to="/login" replace />}
      />

      {/* Anything else → root (which re-runs the same token check) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
