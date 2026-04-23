import { mapColors } from './defaults';

export const buildTheme = (
    isDark: boolean,
    primaryColor: string | undefined,
    refresh: () => void | Promise<void>
) => {
    const colors = mapColors(isDark);
    return {
        isDark,
        colors: {
            ...colors,
            primary: primaryColor || colors.primary,
        },
        refresh,
    };
};
