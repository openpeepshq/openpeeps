import { generatePalette, type Palette } from './colors';

export const generateColorCSS = (colorKey: string, color: string) => {
	let newCSS = '';
	const newPalette: Record<string, Palette> = {};
	newPalette[colorKey] = generatePalette(color);
	newCSS += `/* ${colorKey} | ${newPalette[colorKey][500].hex} */\n\t`;
	for (const [k, v] of Object.entries(newPalette[colorKey])) {
		newCSS += `--color-${colorKey}-${k}: ${v.rgb}; /* ⬅ ${v.hex} */\n\t`;
	}
	return newCSS;
};

export const theme = (baseTheme: string, primaryHex: string, background: string) => `<style>
	:root [data-theme='${baseTheme}']{
	${generateColorCSS('primary', primaryHex)}
	}
	body {
		scrollbar-color: rgb(var(--color-primary-500) / 0.5) transparent;
		background-image: url(${background});
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}
	body * {
		border-color: rgb(var(--color-surface-100));
	}
	.modal *:focus:not([tabindex='-1']):not(.input):not(.textarea):not(.select):not(.input-group):not(.input-group input) {
		outline-color: rgb(var(--color-primary-500) / 0.5) !important; 
	}
	.prose.allpeep-markdown {
		--tw-prose-body: rgb(var(--theme-font-color-base));
		--tw-prose-headings: rgb(var(--theme-font-color-base));
		--tw-prose-links: rgb(var(--color-primary-500));
		--tw-prose-bold: rgb(var(--theme-font-color-base));
		--tw-prose-code: rgb(var(--theme-font-color-base));
		--tw-prose-lead: rgb(var(--theme-font-color-base));
		--tw-prose-hr: rgb(var(--theme-font-color-base));
		--tw-prose-th-borders: rgb(var(--color-surface-200));
		--tw-prose-td-borders: rgb(var(--color-surface-200));
		--tw-prose-quotes: rgb(var(--theme-font-color-base));
		--tw-prose-quote-borders: rgb(var(--color-surface-400));
		--tw-prose-counters: rgb(var(--theme-font-color-base));
		--tw-prose-bullets: rgb(var(--theme-font-color-base));
		--tw-prose-captions: rgb(var(--theme-font-color-base));
		--tw-prose-pre-code: rgb(var(--theme-font-color-base));
		--tw-prose-pre-bg: rgb(var(--color-surface-100));
	}
</style>`;

export const setTheme = (baseTheme: string) => {
	const body = document.querySelector('body');
	if (body) {
		body.setAttribute('data-theme', baseTheme);
	}
};
