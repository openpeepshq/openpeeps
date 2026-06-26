import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
import type { Snippet } from 'svelte';
interface $$Props extends Omit<HTMLAttributes<HTMLAnchorElement>, 'style'> {
    style?: StandardProperties & StandardLonghandProperties & StandardShorthandProperties;
    href: string;
    target?: string;
    pX?: number;
    pY?: number;
    children?: Snippet;
}
declare const Button: import("svelte").Component<$$Props, {}, "">;
type Button = ReturnType<typeof Button>;
export default Button;
