import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLAnchorElement>, 'style'> {
    style?: StandardLonghandProperties & StandardShorthandProperties & StandardProperties;
    target?: string;
    href: string;
}
declare const Link: import("svelte").Component<$$Props, {}, "">;
type Link = ReturnType<typeof Link>;
export default Link;
