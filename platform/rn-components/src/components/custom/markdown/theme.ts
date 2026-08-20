import { StyleSheet } from 'react-native';
import { OpenPeepsTheme } from '~/theme/types';

export const markdownTheme = (colors: OpenPeepsTheme['colors']): StyleSheet.NamedStyles<unknown> => {
    return ({
        body: {
            color: colors.foreground,
        },
        link: {
            color: colors.primary,
            textDecorationLine: 'underline',
        },
        heading1: {
            color: colors.foreground,
            fontWeight: 'bold',
            fontSize: 24,
        },
        heading2: {
            color: colors.foreground,
            fontWeight: 'bold',
            fontSize: 20,
        },
        paragraph: {
            color: colors.foreground,
            lineHeight: 24,
            fontSize: 16,
        },
        list: {
            color: colors.foreground,
            lineHeight: 24,
            fontSize: 16,
        },
        listItem: {
            color: colors.foreground,
            lineHeight: 24,
            fontSize: 16,
        },
        blockquote: {
            backgroundColor: colors.background,
            borderLeftColor: colors.border,
            borderLeftWidth: 4,
            padding: 8,
        },
        code_inline: {
            backgroundColor: colors.muted,
            color: colors.foreground,
            padding: 4,
            borderRadius: 4,
        },
        code_block: {
            backgroundColor: colors.muted,
            color: colors.foreground,
            padding: 8,
            borderRadius: 4,
        },
    });
};
