import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)

// Register Service Worker
registerSW({
  onNeedRefresh() {
    if (confirm('应用有更新，是否刷新以获取最新版本？')) {
      location.reload()
    }
  },
  onOfflineReady() {
    console.log('应用已准备好离线使用')
  },
})

app.use(router)
app.mount('#app')
