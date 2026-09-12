import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@medusajs/icons",
        replacement: fileURLToPath(new URL("./third_party/medusa-icons/src/index.ts", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./third_party/medusa-ui/src", import.meta.url)),
      },
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
})
