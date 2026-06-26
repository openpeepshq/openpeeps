import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLImageElement>, 'style'> {
    style?: StandardProperties & StandardLonghandProperties & StandardShorthandProperties;
    alt: string;
    src: string;
    width?: string;
    height?: string;
}
declare const Img: import("svelte").Component<$$Props, {}, "">;
type Img = ReturnType<typeof Img>;
export default Img;
