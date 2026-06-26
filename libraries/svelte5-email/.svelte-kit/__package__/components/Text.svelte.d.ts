import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'style'> {
    style?: StandardLonghandProperties & StandardShorthandProperties & StandardProperties;
}
declare const Text: import("svelte").Component<$$Props, {}, "">;
type Text = ReturnType<typeof Text>;
export default Text;
