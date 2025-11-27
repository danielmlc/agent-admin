import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 使用 Element Plus（从 CDN 全局变量）
app.use(ElementPlus, {
  locale: ElementPlusLocaleZhCn,
})

// 注册所有 Element Plus Icons（从 CDN）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用路由
app.use(router)

app.mount('#app')
