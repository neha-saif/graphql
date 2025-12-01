import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/graphql">
    <App />
  </BrowserRouter>
);
