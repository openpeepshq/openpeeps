export type ColorName = 'background' | 'foreground' | 'card' | 'card-foreground' | 'popover' | 'popover-foreground' | 'primary' | 'primary-foreground' | 'secondary' | 'secondary-foreground' | 'muted' | 'muted-foreground' | 'accent' | 'accent-foreground' | 'destructive' | 'destructive-foreground' | 'border' | 'input' | 'ring' | 'alpha';

export type ColorValue = {
    name: ColorName;
    light: string;
    dark: string;
};

export type OpenPeepsTheme = {
    isDark: boolean;
    refresh: () => void | Promise<void>;
    colors: {
        [key in ColorName]: string;
    };
};
