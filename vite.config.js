import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import path from "path";

const apiBaseUrl = process.env.VITE_API_BASE_URL || "";

function serveFresh() {
	return {
		name: "serve-fresh",
		configureServer(server) {
			server.middlewares.use((req, _res, next) => {
				delete req.headers["if-none-match"];
				delete req.headers["if-modified-since"];
				next();
			});
		},
	};
}

export default defineConfig({
	define: apiBaseUrl
		? { __CPL_API_BASE_URL__: JSON.stringify(apiBaseUrl) }
		: {},

	server: {
		port: 5179,
		strictPort: true,
		headers: {
			"Cache-Control": "no-store",
		},
	},

	plugins: [
		serveFresh(),
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
