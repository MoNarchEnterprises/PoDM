import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Import the path module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Define the same alias you used in tsconfig.json
      '@common': path.resolve(__dirname, '../common'),
    },
  },
})
