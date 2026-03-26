// TODO remove when svelte-markdown updated

import type { Component } from 'svelte';
export interface HtmlRenderers {
	[key: string]: Component<any, any, any> | null;
}
export type Renderers = {
	html: HtmlRenderers;
} & {
	[key: string]: Component<any> | null;
};
