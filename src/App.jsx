import { Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import { getToken } from "./lib/auth.js";  

function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}
//routes all paths to respective pages

//what does this private route stuff et mean? amd the replace parts ?? !!

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
