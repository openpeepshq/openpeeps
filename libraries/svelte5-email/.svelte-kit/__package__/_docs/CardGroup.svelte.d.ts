interface $$__sveltets_2_IsomorphicComponent<Props extends Record<string, any> = any, Events extends Record<string, any> = any, Slots extends Record<string, any> = any, Exports = {}, Bindings = string> {
    new (options: import('svelte').ComponentConstructorOptions<Props>): import('svelte').SvelteComponent<Props, Events, Slots> & {
        $$bindings?: Bindings;
    } & Exports;
    (internal: unknown, props: Props & {
        $$events?: Events;
        $$slots?: Slots;
    }): Exports & {
        $set?: any;
        $on?: any;
    };
    z_$$bindings?: Bindings;
}
type $$__sveltets_2_PropsWithChildren<Props, Slots> = Props & (Slots extends {
    default: any;
} ? Props extends Record<string, never> ? any : {
    children?: any;
} : {});
declare const CardGroup: $$__sveltets_2_IsomorphicComponent<$$__sveltets_2_PropsWithChildren<{
    cols?: 1 | 2 | 3 | 4;
}, {
    default: {};
}>, {
    [evt: string]: CustomEvent<any>;
}, {
    default: {};
}, {
    cols: 1 | 2 | 3 | 4;
}, string>;
type CardGroup = InstanceType<typeof CardGroup>;
export default CardGroup;
