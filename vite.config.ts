import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
	const isFirefox = mode === 'firefox';
	const browserTarget = isFirefox ? 'firefox-desktop' : 'chromium';
	const manifestFile = isFirefox ? 'src/manifest-firefox.json' : 'src/manifest.json';

	return {
		publicDir: 'resources/public',
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'@utils': resolve(__dirname, 'src/0_common/utils'),
				'@types': resolve(__dirname, 'src/0_common/types'),
				'@constants': resolve(__dirname, 'src/0_common/constants'),
			},
		},
		plugins: [
			webExtension({
				manifest: () => {
					const m = readJsonFile(manifestFile);
					const content = Array.isArray(m.content_scripts) ? m.content_scripts[0] ?? {} : {};

					const manifest: any = {
						...m,
						content_scripts: [
							{
								...content,
								js: ['src/1_content/index.ts'],
								css: ['src/1_content/resources/content.css'],
							},
						],
						action: m.action
							? {
								...m.action,
								default_popup: 'src/3_popup/index.html',
							}
							: undefined,
						browser_action: m.browser_action
							? {
								...m.browser_action,
								default_popup: 'src/3_popup/index.html',
							}
							: undefined,
						options_ui: m.options_ui
							? {
								...m.options_ui,
								page: 'src/4_options/index.html',
								open_in_tab: true,
							}
							: undefined,
					};

					// For Chromium builds, ensure MV3 service worker uses TS entry
					if (!isFirefox) {
						manifest.background = {
							...(m.background || {}),
							service_worker: 'src/2_background/index.ts',
							type: 'module',
						};
					}

					return manifest;
				},
				watchFilePaths: ['src/manifest.json', 'src/manifest-firefox.json'],
				printSummary: true,
				additionalInputs: ['src/9_offscreen/offscreen.html'],
				webExtConfig: {
					target: browserTarget,
					startUrl: ['https://en.wikipedia.org/wiki/A_Game_of_Thrones'],
					args: browserTarget === 'chromium' ? ['--window-size=1300,1000'] : undefined,
				},
			}),
			viteStaticCopy({
				targets: [
					{ src: 'resources/icons/**/*', dest: 'icons' },
					{ src: 'src/_locales', dest: '' },
					{ src: 'resources/8_generate', dest: 'resources' },
				],
			}),
		],
		build: {
			outDir: 'dist',
			emptyOutDir: true,
			sourcemap: process.env.NODE_ENV !== 'production' ? 'inline' : false,
			minify: process.env.NODE_ENV === 'production',
		},
	};
});
