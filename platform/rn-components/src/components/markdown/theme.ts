import { StyleProp, TextStyle, StyleSheet } from 'react-native';
import { OpenPeepsTheme } from '../../theme/types';

export interface MarkdownThemeOptions {
  /**
   * Text metrics override (e.g. `text-sm` → `{fontSize: 14, lineHeight: 20}`)
   * merged over the theme's paragraph/list styles for compact contexts that
   * must stay smaller than the base 16/24 markdown.
   */
  baseTextStyle?: StyleProp<TextStyle>;
}

const mergeTextStyles = (
  base: TextStyle,
  override?: StyleProp<TextStyle>
): TextStyle => ({ ...base, ...(StyleSheet.flatten(override) as TextStyle) });

export const markdownTheme = (
  colors: OpenPeepsTheme['colors'],
  { baseTextStyle }: MarkdownThemeOptions = {}
): StyleSheet.NamedStyles<unknown> => {
  return {
    body: {
      ...mergeTextStyles({ color: colors.foreground }, baseTextStyle),
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
      ...mergeTextStyles(
        { color: colors.foreground, lineHeight: 24, fontSize: 16 },
        baseTextStyle
      ),
    },
    list: {
      ...mergeTextStyles(
        { color: colors.foreground, lineHeight: 24, fontSize: 16 },
        baseTextStyle
      ),
    },
    listItem: {
      ...mergeTextStyles(
        { color: colors.foreground, lineHeight: 24, fontSize: 16 },
        baseTextStyle
      ),
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
  };
};
