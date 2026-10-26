import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { marked } from 'marked';
import {
  AtSign,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  RichText,
  darkEditorCss,
  useBridgeState,
  useEditorBridge,
  useEditorContent,
} from '@10play/tentap-editor';
import {
  normalizeRichTextMarkdown,
  richTextJsonToMarkdown,
  safeRichTextHref,
} from '@openpeepshq/common/lib';
import { useTranslation } from 'react-i18next';
import { iconWithClassName } from '../../../icons/iconWithClassName';
import { Button } from '../../../ui/button';
import { ThemedText } from '../../../ui/themed-text';
import { cn } from '../../../../lib/utils';

const toolbarIcons = [
  AtSign,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
];
toolbarIcons.forEach((icon) => iconWithClassName(icon));

export type RichTextVariant = 'article' | 'compact';

export type RichTextApi = {
  insertMention: (handle: string) => void;
};

const markdownToEditorHtml = (markdown: string): string => {
  if (!markdown.trim()) return '<p></p>';
  return marked.parse(markdown, { async: false }) as string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

type ToolButtonProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon: LucideIcon;
};

const ToolButton = ({
  label,
  active = false,
  onPress,
  icon: Icon,
}: ToolButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: active }}
    onPress={onPress}
    className={cn(
      'h-8 min-w-8 items-center justify-center rounded-md px-1.5',
      active && 'bg-surface-primary'
    )}
  >
    <Icon className={cn('size-4 text-foreground', active && 'text-primary')} />
  </Pressable>
);

export interface NativeRichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  variant: RichTextVariant;
  placeholder?: string;
  maxLength: number;
  rows?: number;
  autoFocus?: boolean;
  onMentionPress: () => void;
  onReady: (api: RichTextApi) => void;
}

export const NativeRichTextField = ({
  value,
  onChange,
  variant,
  placeholder,
  maxLength,
  rows = 5,
  autoFocus = false,
  onMentionPress,
  onReady,
}: NativeRichTextFieldProps) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const maxLengthRef = useRef(maxLength);
  const lastRef = useRef(value);
  const sawInitial = useRef(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState(false);

  onChangeRef.current = onChange;
  onReadyRef.current = onReady;
  maxLengthRef.current = maxLength;

  const editor = useEditorBridge({
    autofocus: autoFocus,
    disableColorHighlight: true,
    initialContent: markdownToEditorHtml(value),
    dynamicHeight: false,
    theme: {
      webview: { backgroundColor: isDark ? '#09090b' : '#ffffff' },
    },
  });
  const state = useBridgeState(editor);
  const json = useEditorContent(editor, { type: 'json' });

  useEffect(() => {
    if (!state.isReady) return;
    editor.setPlaceholder(placeholder ?? '');
    if (isDark) editor.injectCSS(darkEditorCss);
    onReadyRef.current({
      insertMention: (handle) => {
        editor.insertContent(`@${handle} `);
      },
    });
  }, [editor, isDark, placeholder, state.isReady]);

  useEffect(() => {
    if (!json) return;
    const markdown = normalizeRichTextMarkdown(richTextJsonToMarkdown(json));
    if (!sawInitial.current) {
      sawInitial.current = true;
      return;
    }
    if (markdown === lastRef.current) return;
    if (markdown.length > maxLengthRef.current) {
      editor.setContent(markdownToEditorHtml(lastRef.current), {
        emitUpdate: false,
      });
      return;
    }
    lastRef.current = markdown;
    onChangeRef.current(markdown);
  }, [editor, json]);

  useEffect(() => {
    if (value === lastRef.current) return;
    lastRef.current = value;
    sawInitial.current = false;
    editor.setContent(markdownToEditorHtml(value), { emitUpdate: false });
  }, [editor, value]);

  const applyLink = () => {
    const href = safeRichTextHref(linkUrl);
    if (href === null) {
      setLinkError(true);
      return;
    }
    if (!href) {
      editor.setLink('');
    } else if (state.canSetLink) {
      editor.setLink(href);
    } else {
      editor.insertContent(
        `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`
      );
    }
    setLinkOpen(false);
    setLinkError(false);
    setLinkUrl('');
  };

  const article = variant === 'article';

  return (
    <View className="overflow-hidden rounded-md border border-border bg-background">
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        className="border-b border-border bg-card"
        contentContainerClassName="flex-row items-center gap-0.5 px-1.5 py-1"
      >
        <ToolButton
          label={t('form.richText.bold')}
          active={state.isBoldActive}
          icon={Bold}
          onPress={() => editor.toggleBold()}
        />
        <ToolButton
          label={t('form.richText.italic')}
          active={state.isItalicActive}
          icon={Italic}
          onPress={() => editor.toggleItalic()}
        />
        <ToolButton
          label={t('form.richText.strike')}
          active={state.isStrikeActive}
          icon={Strikethrough}
          onPress={() => editor.toggleStrike()}
        />
        <View className="mx-1 h-4 w-px bg-border" />
        {article ? (
          <>
            <ToolButton
              label={t('form.richText.heading1')}
              active={state.headingLevel === 1}
              icon={Heading1}
              onPress={() => editor.toggleHeading(1)}
            />
            <ToolButton
              label={t('form.richText.heading2')}
              active={state.headingLevel === 2}
              icon={Heading2}
              onPress={() => editor.toggleHeading(2)}
            />
            <ToolButton
              label={t('form.richText.heading3')}
              active={state.headingLevel === 3}
              icon={Heading3}
              onPress={() => editor.toggleHeading(3)}
            />
            <View className="mx-1 h-4 w-px bg-border" />
          </>
        ) : null}
        <ToolButton
          label={t('form.richText.bulletList')}
          active={state.isBulletListActive}
          icon={List}
          onPress={() => editor.toggleBulletList()}
        />
        <ToolButton
          label={t('form.richText.orderedList')}
          active={state.isOrderedListActive}
          icon={ListOrdered}
          onPress={() => editor.toggleOrderedList()}
        />
        {article ? (
          <>
            <View className="mx-1 h-4 w-px bg-border" />
            <ToolButton
              label={t('form.richText.quote')}
              active={state.isBlockquoteActive}
              icon={Quote}
              onPress={() => editor.toggleBlockquote()}
            />
            <ToolButton
              label={t('form.richText.code')}
              active={state.isCodeActive}
              icon={Code}
              onPress={() => editor.toggleCode()}
            />
          </>
        ) : null}
        <View className="mx-1 h-4 w-px bg-border" />
        <ToolButton
          label={t('form.richText.link')}
          active={state.isLinkActive || linkOpen}
          icon={Link}
          onPress={() => {
            setLinkUrl(state.activeLink ?? '');
            setLinkError(false);
            setLinkOpen((open) => !open);
          }}
        />
        <ToolButton
          label={t('form.richText.mention')}
          icon={AtSign}
          onPress={onMentionPress}
        />
      </ScrollView>
      {linkOpen ? (
        <View className="gap-1 border-b border-border px-2 py-2">
          <TextInput
            value={linkUrl}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('form.richText.linkUrl')}
            placeholder={t('form.richText.linkUrl')}
            onChangeText={(next) => {
              setLinkUrl(next);
              setLinkError(false);
            }}
            onSubmitEditing={applyLink}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
          {linkError ? (
            <ThemedText className="text-xs text-destructive">
              {t('form.richText.invalidUrl')}
            </ThemedText>
          ) : null}
          <View className="flex-row gap-2">
            <Button size="sm" onPress={applyLink}>
              <ThemedText>{t('form.richText.apply')}</ThemedText>
            </Button>
            {state.isLinkActive ? (
              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  editor.setLink('');
                  setLinkOpen(false);
                }}
              >
                <ThemedText>{t('form.richText.removeLink')}</ThemedText>
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={{ height: Math.max(rows, 4) * 28 }}>
        <RichText editor={editor} style={{ flex: 1 }} />
      </View>
    </View>
  );
};
