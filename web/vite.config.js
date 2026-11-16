import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api to the website's API. Default: a local backend on :5001 (the coal platform's
// `bash run_app.sh`). To work against the live data instead:
//   BCX_API_TARGET=https://bcx-newsletter.gna.energy npm run dev
// A production build does not proxy: it calls VITE_API_BASE directly (.env.production, or the CI variable).
const API = process.env.BCX_API_TARGET || 'http://localhost:5001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5180,            // not 5173: the coal platform's studio runs there
    proxy: { '/api': { target: API, changeOrigin: true, secure: true } },
  },
})
