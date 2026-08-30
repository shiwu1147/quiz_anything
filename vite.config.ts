import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages 會把不存在的路徑交給 404.html。把 index.html 原樣複製一份過去，
// /quiz、/bank 這種直接輸入網址或重新整理的情況才不會落到 GitHub 的 404 畫面。
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html']
      if (html?.type !== 'asset') {
        this.warn('找不到 index.html，沒有產生 404.html')
        return
      }
      this.emitFile({ type: 'asset', fileName: '404.html', source: html.source })
    },
  }
}

export default defineConfig(({ command }) => ({
  // 專案型 Pages 的網址是 https://<帳號>.github.io/<repo 名>/，
  // 資產與路由都要掛在這個子路徑底下。repo 改名的話這裡要一起改。
  base: command === 'build' ? '/quiz_anything/' : '/',
  plugins: [react(), spaFallback()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}))
