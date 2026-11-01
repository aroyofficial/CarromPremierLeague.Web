import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import path from "path";

const apiBaseUrl = process.env.VITE_API_BASE_URL || "";

export default defineConfig({
	define: {
		__CPL_API_BASE_URL__: JSON.stringify(apiBaseUrl),
	},

	plugins: [
		vue(),
		AutoImport({
			resolvers: [ElementPlusResolver()],
		}),
		Components({
			resolvers: [ElementPlusResolver()],
		}),
	],

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
