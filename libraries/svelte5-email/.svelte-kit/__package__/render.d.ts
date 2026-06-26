import { type Component } from 'svelte';
export declare const render: ({ template, props, options }: {
    template: Component<any, {}, string>;
    props?: Record<string, any>;
    options?: {
        plainText?: boolean;
        pretty?: boolean;
    };
}) => string;
