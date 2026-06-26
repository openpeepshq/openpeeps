import type { HTMLAttributes } from 'svelte/elements';
import type { Snippet } from 'svelte';
interface $$Props extends Omit<HTMLAttributes<HTMLHtmlElement>, 'style'> {
    lang?: string;
    children?: Snippet;
}
declare const Html: import("svelte").Component<$$Props, {}, "">;
type Html = ReturnType<typeof Html>;
export default Html;
