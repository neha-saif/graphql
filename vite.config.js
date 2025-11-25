import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/graphql": {
        target: "https://learn.reboot01.com/api/graphql-engine/v1",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/graphql/, "")
      }
    }
  }
});
