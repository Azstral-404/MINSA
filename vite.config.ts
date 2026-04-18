import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Optionally load lovable-tagger only in development (may not be present on all systems)
  let componentTagger: (() => unknown) | null = null;
  if (mode === "development") {
    try {
      const mod = await import("lovable-tagger");
      componentTagger = mod.componentTagger;
    } catch {
      // lovable-tagger not available, skip
    }
  }

  return {
    // CRITICAL for Electron: use relative paths so file:// protocol works
    base: mode === "development" ? "/" : "./",
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    build: {
      // Optimize for production bundle size
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: true,
          passes: 2,
        },
      },
      // Increase chunk warning limit (Electron bundles are larger)
      chunkSizeWarningLimit: 2048,
      rollupOptions: {
        output: {
          // Code split for faster initial load
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "ui-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
            ],
            "pdf-tools": ["jspdf", "html2canvas"],
          },
        },
      },
    },
    plugins: [
      react(),
      ...(componentTagger ? [componentTagger()] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
