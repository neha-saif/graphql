import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { getToken } from "./lib/auth.js";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          getToken()
            ? <Navigate to="/profile" replace />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/login"
        element={
          getToken()
            ? <Navigate to="/profile" replace />
            : <Login />
        }
      />

      <Route
        path="/profile"
        element={
          getToken()
            ? <Profile />
            : <Navigate to="/login" replace />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
