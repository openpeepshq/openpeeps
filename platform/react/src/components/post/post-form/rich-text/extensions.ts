import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

/**
 * Formatting the renderer already keeps. Underline, color, font, and images
 * are left out so they cannot be stored.
 */
export const richTextExtensions = (placeholder: string) => [
  StarterKit.configure({
    underline: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: { rel: 'noopener noreferrer' },
      isAllowedUri: (url, { defaultValidate }) => {
        if (url.startsWith('/') && !url.startsWith('//')) return true;
        return defaultValidate(url);
      },
    },
  }),
  Placeholder.configure({ placeholder }),
  Markdown,
];
