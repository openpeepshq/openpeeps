import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLTableCellElement>, 'style'> {
    style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
    class?: string | undefined;
}
declare const Column: import("svelte").Component<$$Props, {}, "">;
type Column = ReturnType<typeof Column>;
export default Column;
