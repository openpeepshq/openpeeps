import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'class'> {
    style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
    class?: string | undefined;
}
declare const Container: import("svelte").Component<$$Props, {}, "">;
type Container = ReturnType<typeof Container>;
export default Container;
