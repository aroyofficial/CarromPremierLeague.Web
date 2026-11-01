import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import dayjs from "@/plugins/dayjs";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@/assets/styles/global.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

app.config.globalProperties.$dayjs = dayjs;

app.mount("#app");
