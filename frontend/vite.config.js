import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA so the tool keeps working on flaky ward wifi (offline-first shell).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Enteral Feeding Glycaemic Tool (Research Prototype)",
        short_name: "EnteralTool",
        description: "Advisory tool — NOT FOR CLINICAL USE",
        theme_color: "#0f3d57",
        background_color: "#f6f8fa",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": { target: "http://localhost:5173", changeOrigin: true },
    },
  },
});