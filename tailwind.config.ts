import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}", // 包含 components 資料夾
    "./*.{js,ts,jsx,tsx}"                // 包含根目錄下的 App.tsx, index.tsx
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config