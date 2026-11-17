import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import dayjs from "@/plugins/dayjs";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@/assets/styles/global.css";
import { initTheme } from "@/utils/theme";
import { carromLoading } from "@/directives/carromLoading";

initTheme();

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);
// Element Plus registers v-loading. Swap in the carrom board before the first view renders.
delete app._context.directives.loading;
app.directive("loading", carromLoading);

app.config.globalProperties.$dayjs = dayjs;

// Mounting before the first navigation resolves leaves the router view empty
// on pages whose guard returns immediately, so a fresh /login?redirect= link
// never shows the form.
router.isReady().then(() => app.mount("#app"));
