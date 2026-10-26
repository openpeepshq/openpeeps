import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
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
  Minus,
  Quote,
  SquareCode,
  Strikethrough,
} from 'lucide-react';
import { safeRichTextHref } from '@openpeepshq/common/lib';
import { Button, Input, cn } from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import { OPENPEEPS_MARKDOWN_PROSE_CLASS } from '../../../markdown/classes';
import { richTextExtensions } from './extensions';

export type RichTextVariant = 'article' | 'compact';

export type RichTextApi = {
  replaceActiveMention: (handle: string) => void;
};

export interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  variant: RichTextVariant;
  placeholder?: string;
  maxLength: number;
  rows?: number;
  className?: string;
  testId?: string;
  onMentionQuery: (query: string | null) => void;
  onReady: (api: RichTextApi) => void;
}

const normalize = (markdown: string) =>
  markdown.replace(/\u00a0/g, ' ').replace(/\n+$/, '');

const mentionAt = (editor: Editor) => {
  const { from } = editor.state.selection;
  const text = editor.state.doc.textBetween(
    Math.max(0, from - 40),
    from,
    '\n',
    '\0',
  );
  const match = text.match(/@([a-zA-Z0-9_-]*)$/);
  if (!match) return null;
  return {
    query: match[1] ?? '',
    from: from - match[0].length,
    to: from,
  };
};

type FormatButtonProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
};

const FormatButton = ({
  label,
  active = false,
  onPress,
  children,
}: FormatButtonProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    title={label}
    onMouseDown={(event) => {
      event.preventDefault();
    }}
    onClick={onPress}
    className={cn(
      'text-foreground inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5',
      active && 'bg-surface-primary text-primary',
    )}
  >
    {children}
  </button>
);

const Divider = () => <span className="bg-border mx-1 h-4 w-px shrink-0" />;

export const RichTextField = ({
  value,
  onChange,
  variant,
  placeholder,
  maxLength,
  rows = 5,
  className,
  testId,
  onMentionQuery,
  onReady,
}: RichTextFieldProps) => {
  const t = useT();
  const onChangeRef = useRef(onChange);
  const onMentionRef = useRef(onMentionQuery);
  const maxLengthRef = useRef(maxLength);
  const lastRef = useRef(value);
  const mentionRange = useRef<{ from: number; to: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState(false);
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    strike: false,
    h1: false,
    h2: false,
    h3: false,
    bullet: false,
    ordered: false,
    quote: false,
    code: false,
    codeBlock: false,
    link: false,
  });

  onChangeRef.current = onChange;
  onMentionRef.current = onMentionQuery;
  maxLengthRef.current = maxLength;

  const sync = (current: Editor) => {
    const mention = mentionAt(current);
    mentionRange.current = mention
      ? { from: mention.from, to: mention.to }
      : null;
    onMentionRef.current(mention ? mention.query : null);
    setActive({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      h1: current.isActive('heading', { level: 1 }),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      quote: current.isActive('blockquote'),
      code: current.isActive('code'),
      codeBlock: current.isActive('codeBlock'),
      link: current.isActive('link'),
    });
  };

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: richTextExtensions(placeholder ?? ''),
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': placeholder ?? t('posts.form.content'),
      },
    },
    onCreate: ({ editor: created }) => {
      onReadyRef.current({
        replaceActiveMention: (handle) => {
          const range = mentionRange.current;
          const chain = created.chain().focus();
          const next = range ? chain.deleteRange(range) : chain;
          next.insertContent(`@${handle} `).run();
          mentionRange.current = null;
          onMentionRef.current(null);
        },
      });
    },
    onSelectionUpdate: ({ editor: current }) => sync(current),
    onUpdate: ({ editor: current }) => {
      sync(current);
      const markdown = normalize(current.getMarkdown());
      if (markdown === lastRef.current) return;
      if (markdown.length > maxLengthRef.current) {
        current.commands.setContent(lastRef.current, {
          contentType: 'markdown',
          emitUpdate: false,
        });
        return;
      }
      lastRef.current = markdown;
      onChangeRef.current(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastRef.current) return;
    lastRef.current = value;
    editor.commands.setContent(value, {
      contentType: 'markdown',
      emitUpdate: false,
    });
  }, [editor, value]);

  const applyLink = () => {
    if (!editor) return;
    const href = safeRichTextHref(linkUrl);
    if (href === null) {
      setLinkError(true);
      return;
    }
    const chain = editor.chain().focus();
    if (!href) {
      chain.extendMarkRange('link').unsetLink().run();
    } else if (editor.state.selection.empty) {
      chain
        .insertContent({
          type: 'text',
          text: href,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    } else {
      chain.extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
    setLinkError(false);
    setLinkUrl('');
  };

  const icon = 'size-4';
  const article = variant === 'article';

  return (
    <div
      data-testid={testId}
      className={cn(
        'border-border bg-background focus-within:ring-ring overflow-hidden rounded-md border focus-within:ring-2',
        className,
      )}
      style={{ minHeight: `${Math.max(rows, 4) * 1.75}rem` }}
    >
      <div className="bg-card border-border flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        <FormatButton
          label={t('form.richText.bold')}
          active={active.bold}
          onPress={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className={icon} />
        </FormatButton>
        <FormatButton
          label={t('form.richText.italic')}
          active={active.italic}
          onPress={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className={icon} />
        </FormatButton>
        <FormatButton
          label={t('form.richText.strike')}
          active={active.strike}
          onPress={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className={icon} />
        </FormatButton>
        <Divider />
        {article ? (
          <>
            <FormatButton
              label={t('form.richText.heading1')}
              active={active.h1}
              onPress={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <Heading1 className={icon} />
            </FormatButton>
            <FormatButton
              label={t('form.richText.heading2')}
              active={active.h2}
              onPress={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 className={icon} />
            </FormatButton>
            <FormatButton
              label={t('form.richText.heading3')}
              active={active.h3}
              onPress={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              <Heading3 className={icon} />
            </FormatButton>
            <Divider />
          </>
        ) : null}
        <FormatButton
          label={t('form.richText.bulletList')}
          active={active.bullet}
          onPress={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className={icon} />
        </FormatButton>
        <FormatButton
          label={t('form.richText.orderedList')}
          active={active.ordered}
          onPress={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className={icon} />
        </FormatButton>
        {article ? (
          <>
            <Divider />
            <FormatButton
              label={t('form.richText.quote')}
              active={active.quote}
              onPress={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote className={icon} />
            </FormatButton>
            <FormatButton
              label={t('form.richText.code')}
              active={active.code}
              onPress={() => editor?.chain().focus().toggleCode().run()}
            >
              <Code className={icon} />
            </FormatButton>
            <FormatButton
              label={t('form.richText.codeBlock')}
              active={active.codeBlock}
              onPress={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <SquareCode className={icon} />
            </FormatButton>
            <FormatButton
              label={t('form.richText.horizontalRule')}
              onPress={() => editor?.chain().focus().setHorizontalRule().run()}
            >
              <Minus className={icon} />
            </FormatButton>
          </>
        ) : null}
        <Divider />
        <FormatButton
          label={t('form.richText.link')}
          active={active.link || linkOpen}
          onPress={() => {
            const href = editor?.getAttributes('link').href;
            setLinkUrl(typeof href === 'string' ? href : '');
            setLinkError(false);
            setLinkOpen((open) => !open);
          }}
        >
          <Link className={icon} />
        </FormatButton>
        <FormatButton
          label={t('form.richText.mention')}
          onPress={() => editor?.chain().focus().insertContent('@').run()}
        >
          <AtSign className={icon} />
        </FormatButton>
      </div>
      {linkOpen ? (
        <form
          className="border-border flex items-center gap-2 border-b px-2 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <Input
            value={linkUrl}
            aria-label={t('form.richText.linkUrl')}
            placeholder={t('form.richText.linkUrl')}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setLinkError(false);
            }}
          />
          <Button compact variant="default" type="submit">
            {t('form.richText.apply')}
          </Button>
          {active.link ? (
            <Button
              compact
              variant="outline"
              action={() => {
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange('link')
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }}
            >
              {t('form.richText.removeLink')}
            </Button>
          ) : null}
        </form>
      ) : null}
      {linkError ? (
        <p className="text-destructive px-2 pt-1 text-xs">
          {t('form.richText.invalidUrl')}
        </p>
      ) : null}
      <EditorContent
        editor={editor}
        className={cn(
          OPENPEEPS_MARKDOWN_PROSE_CLASS,
          'px-3 py-2',
          '[&_.ProseMirror]:outline-none',
          '[&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
        )}
      />
    </div>
  );
};
