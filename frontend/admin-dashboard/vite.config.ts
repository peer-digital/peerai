import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  console.log('Loaded environment:', mode)
  console.log('API Base URL:', env.VITE_API_BASE_URL)

  return {
    define: {
      // Expose environment variables to client
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        mode === 'production' 
          ? (env.VITE_API_BASE_URL || 'http://158.174.210.91')
          : (env.VITE_API_BASE_URL || 'http://localhost:8000')
      ),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        // Proxy API requests to the backend during development
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      allowedHosts: [
        // Allow both frontend and backend Render domains
        'peerai-fe.onrender.com',
        'peerai-be.onrender.com',
        '158.174.210.91',
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
          },
        },
      },
    },
  }
})
