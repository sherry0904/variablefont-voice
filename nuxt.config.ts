// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Variable Font × Voice | 可變字型聲音互動',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '一場利用麥克風聲音即時驅動可變字型 (Variable Font) 的網頁排版互動實驗。' }
      ],
      link: [
        // 使用一個帶有粗體 'V' 或是麥克風 Emoji 的簡約 SVG 當作 Favicon
        { rel: 'icon', type: 'image/svg+xml', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎤</text></svg>' }
      ]
    }
  }
})
