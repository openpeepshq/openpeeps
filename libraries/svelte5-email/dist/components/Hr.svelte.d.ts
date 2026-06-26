import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLHRElement>, 'style'> {
    style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
}
declare const Hr: import("svelte").Component<$$Props, {}, "">;
type Hr = ReturnType<typeof Hr>;
export default Hr;
