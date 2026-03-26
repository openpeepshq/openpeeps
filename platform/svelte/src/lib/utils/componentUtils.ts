import type { Component, ComponentProps } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function presetProps<C extends Component<any>>(
	OriginalComponent: C,
	presets: Partial<ComponentProps<C>>
): Component<ComponentProps<C>> {
	return (anchor, props) => {
		return OriginalComponent(anchor, {
			...presets,
			...props
		});
	};
}
