import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Rollup 4.x native bindings keep worker threads alive on Node 24+, preventing
// the process from exiting after a successful build. Force-exit after bundle close.
const forceExitPlugin = () => ({
  name: 'force-exit',
  closeBundle() {
    if (process.env.NODE_ENV === 'production') {
      process.nextTick(() => process.exit(0));
    }
  },
});

export default defineConfig({
  plugins: [react(), forceExitPlugin()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'charts-vendor'
          }
          if (id.includes('axios')) return 'network-vendor'
          return 'vendor'
        },
      },
    },
  },
})
