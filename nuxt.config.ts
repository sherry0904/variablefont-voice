// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: '華康 | 可變字型聲音互動 | Variable Font × Voice',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '透過麥克風即時捕捉音量與頻率變化，動態驅動可變字型 (Variable Font) 的多維變化。這是一場將聲音轉化為視覺壓迫感與生命力的網頁排版互動實驗。' },
        // Open Graph
        { property: 'og:title', content: '華康 | 可變字型聲音互動 | Variable Font × Voice' },
        { property: 'og:description', content: '這是一場將聲音轉化為視覺壓迫感與生命力的網頁排版互動實驗。即時捕捉聲音數據，賦予文字動態生命。' },
        { property: 'og:type', content: 'website' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'}
      ]
    }
  }
})
