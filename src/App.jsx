import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { getToken } from "./lib/auth.js";

export default function App() {
  const hasToken = !!getToken(); // check localStorage on each render

  return (
    <Routes>
      {/* Root: send to profile if logged in, otherwise login */}
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

      {/* Login: if already logged in, don't show login, go to profile */}
      <Route
        path="/login"
        element={<Login/>}
      />

      {/* Profile: if not logged in, send to login */}
      <Route
        path="/profile"
        element={hasToken ? <Profile /> : <Navigate to="/login" replace />}
      />

      {/* Anything else: go through the same logic as "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
