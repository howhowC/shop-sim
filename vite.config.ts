import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages 的網址是 https://howhowc.github.io/shop-sim/，正式版要加上子路徑；
  // 開發時維持 http://localhost:5173/ 比較方便。
  base: command === 'build' ? '/shop-sim/' : '/',
}))
