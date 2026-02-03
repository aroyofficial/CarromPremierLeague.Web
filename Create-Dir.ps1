$root = "D:\CarromPremierLeague.Web"

# =============================
# ROOT LEVEL FOLDERS
# =============================

$rootFolders = @(
    "public",
    "src",
    "src\assets",
    "src\assets\images",
    "src\assets\styles",
    "src\components",
    "src\views",
    "src\router",
    "src\store",
    "src\services",
    "src\utils",
    "src\composables"
)

foreach ($folder in $rootFolders) {
    $path = Join-Path $root $folder
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

# =============================
# ROOT FILES
# =============================

@"
node_modules
dist
.env
"@ | Set-Content "$root\.gitignore"

@"
VITE_API_BASE_URL=https://your-render-api-url.onrender.com
"@ | Set-Content "$root\.env"

@"
{
  "name": "cpl-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "element-plus": "^2.6.0",
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
"@ | Set-Content "$root\package.json"

@"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
"@ | Set-Content "$root\vite.config.js"

@"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>CPL - Carrom Premier League</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
"@ | Set-Content "$root\index.html"

# =============================
# SRC MAIN FILES
# =============================

@"
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/styles/global.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
"@ | Set-Content "$root\src\main.js"

@"
<template>
  <router-view />
</template>
"@ | Set-Content "$root\src\App.vue"

# =============================
# ROUTER
# =============================

@"
import { createRouter, createWebHistory } from 'vue-router'
import LeagueView from '../views/LeagueView.vue'

const routes = [
  {
    path: '/',
    name: 'League',
    component: LeagueView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
"@ | Set-Content "$root\src\router\index.js"

# =============================
# BASIC VIEW
# =============================

@"
<template>
  <div style='padding:40px'>
    <h1>CPL League Table</h1>
  </div>
</template>
"@ | Set-Content "$root\src\views\LeagueView.vue"

# =============================
# GLOBAL STYLES
# =============================

@"
body {
  margin: 0;
  font-family: Arial, sans-serif;
}
"@ | Set-Content "$root\src\assets\styles\global.css"

Write-Host ""
Write-Host "Full CPL Vue + Element Plus Project Created Successfully!"
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. cd D:\CarromPremierLeague.Web"
Write-Host "2. npm install"
Write-Host "3. npm run dev"
Write-Host ""
