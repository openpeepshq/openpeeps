import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
import type { Snippet } from 'svelte';
interface $$Props extends Omit<HTMLAttributes<HTMLBodyElement>, 'style'> {
    style?: StandardLonghandProperties & StandardShorthandProperties & StandardProperties;
    children?: Snippet;
}
declare const Body: import("svelte").Component<$$Props, {}, "">;
type Body = ReturnType<typeof Body>;
export default Body;
