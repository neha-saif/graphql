import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { getToken } from "./lib/auth.js";

export default function App() {
  const token = getToken(); 

  return (
    <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to="/profile" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/login"
        element={token ? <Navigate to="/profile" replace /> : <Login />}
      />

      <Route
        path="/profile"
        element={token ? <Profile /> : <Navigate to="/login" replace />}
      />

      <Route path="*" element={token? <Profile /> : <Navigate to="/" replace />} />
    </Routes>
  );
}
