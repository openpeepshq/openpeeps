import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLTableElement>, 'style'> {
    style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
}
declare const Section: import("svelte").Component<$$Props, {}, "">;
type Section = ReturnType<typeof Section>;
export default Section;
