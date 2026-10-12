import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Вытягиваем адрес живого бэкенда из переменных окружения Render, либо берем локалку
const backendUrl = process.env.VITE_API_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Все запросы, начинающиеся с /api, автоматически перенаправляются на бэкенд
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
