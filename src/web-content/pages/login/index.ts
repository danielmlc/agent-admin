import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 使用 Element Plus (通过 CDN 引入,全局变量为 ElementPlus)
app.use(ElementPlus, {
  locale: ElementPlusLocaleZhCn,
})

// 注册所有图标 (通过 CDN 引入,全局变量为 ElementPlusIconsVue)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用路由
app.use(router)

app.mount('#app')