import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { getToken } from "./lib/auth.js";

export default function App() {
  useLocation(); // re renders the app if route changes
  const hasToken = !!getToken(); // check token on each render

  return (
    <Routes>
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

      <Route
        path="/login"
        element={hasToken ? <Navigate to="/profile" replace /> : <Login />}
      />

      <Route
        path="/profile"
        element={hasToken ? <Profile /> : <Navigate to="/login" replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
