import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const medusaIcons = fileURLToPath(
  new URL("./third_party/medusa-icons/src/index.ts", import.meta.url),
)
const medusaUiSource = fileURLToPath(
  new URL("./third_party/medusa-ui/src/", import.meta.url),
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@medusajs/icons",
        replacement: medusaIcons,
      },
      {
        find: /^@\//,
        replacement: medusaUiSource,
      },
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
})
