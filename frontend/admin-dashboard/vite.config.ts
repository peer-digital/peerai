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
    base: '/app/',
    define: {
      // Expose environment variables to client
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        mode === 'production' 
          ? (env.VITE_API_BASE_URL || '') // Leave blank to use relative URL in production
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
      port: 3000,
      // Allow both local and production domains
      allowedHosts: [
        'localhost',
        '158.174.210.91',
        'peerai-fe.onrender.com',
        'peerai-be.onrender.com',
      ],
      // Add CORS headers to allow requests from multiple domains
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization, X-API-Key'
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
