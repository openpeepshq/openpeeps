import { OpenPeepsTheme, ColorName, ColorValue } from './types';

export const DEFAULT_COLORS: ColorValue[] = [
    {
        name: 'background',
        light: '#ffffff',
        dark: '#0a0a0f',
    },
    {
        name: 'foreground',
        light: '#0a0a0f',
        dark: '#fafafa',
    },
    {
        name: 'card',
        light: '#ffffff',
        dark: '#0a0a0f',
    },
    {
        name: 'card-foreground',
        light: '#0a0a0f',
        dark: '#fafafa',
    },
    {
        name: 'popover',
        light: '#ffffff',
        dark: '#0a0a0f',
    },
    {
        name: 'popover-foreground',
        light: '#0a0a0f',
        dark: '#fafafa',
    },
    {
        name: 'primary',
        light: '#16161a',
        dark: '#fafafa',
    },
    {
        name: 'primary-foreground',
        light: '#fafafa',
        dark: '#16161a',
    },
    {
        name: 'secondary',
        light: '#f4f4f6',
        dark: '#28282e',
    },
    {
        name: 'secondary-foreground',
        light: '#16161a',
        dark: '#fafafa',
    },
    {
        name: 'muted',
        light: '#f4f4f6',
        dark: '#28282e',
    },
    {
        name: 'muted-foreground',
        light: '#71717a',
        dark: '#a1a1aa',
    },
    {
        name: 'accent',
        light: '#f4f4f6',
        dark: '#28282e',
    },
    {
        name: 'accent-foreground',
        light: '#16161a',
        dark: '#fafafa',
    },
    {
        name: 'destructive',
        light: '#ef4444',
        dark: '#dc2626',
    },
    {
        name: 'destructive-foreground',
        light: '#fafafa',
        dark: '#fafafa',
    },
    {
        name: 'border',
        light: '#e4e4e7',
        dark: '#28282e',
    },
    {
        name: 'input',
        light: '#e4e4e7',
        dark: '#28282e',
    },
    {
        name: 'ring',
        light: '#16161a',
        dark: '#d4d4d8',
    },
    {
        name: 'alpha',
        light: '#fafafa',
        dark: '#18181b',
    },
];

export const mapColors = (isDark: boolean) =>
    Object.fromEntries(DEFAULT_COLORS.map(color => [color.name, isDark ? color.dark : color.light])) as Record<ColorName, string>;

export const defaultTheme: OpenPeepsTheme = {
    isDark: true,
    colors: mapColors(true),
    refresh: () => {},
};
