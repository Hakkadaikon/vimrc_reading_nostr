import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const isTest = process.env.NODE_ENV === "test" || !!process.env.VITEST;

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		...(isTest ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	test: {
		exclude: ["e2e/**", "node_modules/**"],
	},
});

export default config;
