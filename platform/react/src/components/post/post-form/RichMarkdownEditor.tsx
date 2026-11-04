import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type MDXEditorMethods,
  type Translation,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { cn } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import {
  convertToWebpIfHeic,
  normalizeSvgFile,
} from '../../../lib/canvasUtils';
import { OPENPEEPS_MARKDOWN_PROSE_CLASS } from '../../markdown/classes';
import './richMarkdown.css';

export interface RichMarkdownEditorHandle {
  setMarkdown: (value: string) => void;
}

export interface RichMarkdownEditorProps {
  value: string;
  onChange: (value: string, initialMarkdownNormalize: boolean) => void;
  onParseError?: () => void;
  placeholder?: string;
  className?: string;
  testId?: string;
  /** Shorter writing surface for posts and messages. */
  compact?: boolean;
}

const CODE_BLOCK_LANGUAGES = {
  txt: 'Text',
  js: 'JavaScript',
  ts: 'TypeScript',
  json: 'JSON',
  bash: 'Shell',
  css: 'CSS',
  html: 'HTML',
  md: 'Markdown',
};

export const RichMarkdownEditor = forwardRef<
  RichMarkdownEditorHandle,
  RichMarkdownEditorProps
>(
  (
    { value, onChange, onParseError, placeholder, className, testId, compact },
    ref,
  ) => {
    const t = useT();
    const editorRef = useRef<MDXEditorMethods>(null);
    const { upload } = useOpenpeeps().openpeepsApi.useMediaUpload();
    const [popupRoot, setPopupRoot] = useState<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => ({
      setMarkdown: (markdown) => editorRef.current?.setMarkdown(markdown),
    }));

    // In source mode the visible surface is the CodeMirror `.cm-editor`, not
    // the (hidden) rich contenteditable, so the `className` prop only reaches
    // it if we copy it here. The `className` prop is documented as "extra
    // classes for the editing surface" and may carry a `min-h-*` utility
    // (e.g. `min-h-48` in EventForm); the default surface height is therefore
    // an inline style (which only applies when the caller did not supply a
    // `min-h-*`), letting prop-driven sizing win as documented.
    useEffect(() => {
      const root = popupRoot;
      if (!root) return;
      const userClasses = (className ?? '').trim().split(/\s+/).filter(Boolean);
      const hasMinHeight = userClasses.some((c) => c.startsWith('min-h-'));
      const min = compact ? 96 : 384; // 6rem / 24rem, matching the rich editor
      const apply = () => {
        // Scope to the source-mode editor only: rich-mode code blocks (via
        // codeMirrorPlugin) also render `.cm-editor` inside the
        // contenteditable, and must not inherit the surface min-height.
        const editor = root.querySelector<HTMLElement>(
          '.mdxeditor-source-editor .cm-editor',
        );
        if (!editor) return;
        for (const el of [
          editor,
          editor.querySelector<HTMLElement>('.cm-scroller'),
        ]) {
          if (!el) continue;
          for (const c of userClasses) el.classList.add(c);
          el.style.minHeight = hasMinHeight ? '' : `${min}px`;
        }
      };
      apply();
      const observer = new MutationObserver(apply);
      observer.observe(root, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [popupRoot, className, compact]);

    // Playwright fills the contenteditable the event form used to expose as a
    // textarea. The id has to land on that node, not the toolbar wrapper.
    useEffect(() => {
      if (!testId || !popupRoot) return;
      const editable =
        popupRoot.querySelector<HTMLElement>('[contenteditable]');
      editable?.setAttribute('data-testid', testId);
    }, [popupRoot, testId]);

    const translateEditor: Translation = useCallback(
      (key, defaultValue, interpolations) =>
        t(`form.richMarkdown.${key}`, {
          defaultValue,
          ...interpolations,
        }),
      [t],
    );

    const plugins = useMemo(
      () => [
        headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin({
          disableImageResize: true,
          allowSetImageDimensions: false,
          imageUploadHandler: async (file) => {
            const processed = await normalizeSvgFile(
              await convertToWebpIfHeic(file),
            );
            const attachment = await upload({
              file: processed,
              usage: 'markdown-image',
            });
            return attachment.url;
          },
        }),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
        codeMirrorPlugin({
          codeBlockLanguages: CODE_BLOCK_LANGUAGES,
          autoLoadLanguageSupport: false,
        }),
        diffSourcePlugin({ viewMode: 'rich-text' }),
        toolbarPlugin({
          toolbarClassName: 'op-rich-markdown-toolbar',
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={['rich-text', 'source']}>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
              <StrikeThroughSupSubToggles options={['Strikethrough']} />
              <CodeToggle />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle options={['bullet', 'number']} />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertThematicBreak />
              <InsertCodeBlock />
            </DiffSourceToggleWrapper>
          ),
        }),
      ],
      [upload],
    );

    return (
      <div ref={setPopupRoot} className="op-rich-markdown-popups">
        <MDXEditor
          ref={editorRef}
          className={cn(
            'op-rich-markdown',
            compact && 'op-rich-markdown-compact',
          )}
          markdown={value}
          placeholder={placeholder}
          trim={false}
          translation={translateEditor}
          overlayContainer={popupRoot}
          plugins={plugins}
          contentEditableClassName={cn(
            OPENPEEPS_MARKDOWN_PROSE_CLASS,
            compact ? 'min-h-24 px-3 py-2' : 'min-h-96 px-4 py-3',
            className,
          )}
          onChange={onChange}
          onError={() => onParseError?.()}
          toMarkdownOptions={{
            emphasis: '*',
            strong: '*',
            bullet: '-',
          }}
        />
      </div>
    );
  },
);
