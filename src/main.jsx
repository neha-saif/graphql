import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const container = document.getElementById("root");

createRoot(container).render(
  <HashRouter>
    <App />
  </HashRouter>
);
