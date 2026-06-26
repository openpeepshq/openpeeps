import type { StandardLonghandProperties, StandardProperties, StandardShorthandProperties } from 'csstype';
import type { HTMLAttributes } from 'svelte/elements';
interface $$Props extends Omit<HTMLAttributes<HTMLHeadingElement>, 'style'> {
    style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    m?: string;
    mx?: string;
    my?: string;
    mt?: string;
    mr?: string;
    mb?: string;
    ml?: string;
}
declare const Heading: import("svelte").Component<$$Props, {}, "">;
type Heading = ReturnType<typeof Heading>;
export default Heading;
