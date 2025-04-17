import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), monacoEditorPlugin.default({})],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to the backend during development
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path  // Keep the /api/v1 prefix
      },
    },
  },
  preview: {
    // @ts-expect-error - allowedHosts is valid but not typed
    allowedHosts: [
      // Allow both frontend and backend Render domains
      'peerai-fe.onrender.com',
      'peerai-be.onrender.com'
    ],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Configure chunks for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
          editor: ['monaco-editor', 'react-monaco-editor'],
          forms: ['@rjsf/core', '@rjsf/mui', '@rjsf/validator-ajv8', '@rjsf/utils'],
        },
      },
    },
  },
})
