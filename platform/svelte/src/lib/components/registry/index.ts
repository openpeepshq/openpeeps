import type { Component } from 'svelte';
import { presetProps } from '$lib/utils/componentUtils';
import ErrorComponent from './ErrorComponent.svelte';

const registry = new Map<string, Component<any>>();

export const registerComponent = (key: string, componentType: Component<any>) =>
	registry.set(key, componentType);

export const getComponent = <Props extends Record<string, unknown>>(
	key: string,
	showError = true
) =>
	(registry.get(key) as Component<Props>) ||
	presetProps(ErrorComponent, { key, registry, showError });
