import type { Config } from "tailwindcss"
import { preset } from "./third_party/medusa-ui-preset/src/preset"

export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./third_party/medusa-ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config
