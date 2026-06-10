import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// `emoji-picker-element` registers an `<emoji-picker>` custom element. Declare
// it as an intrinsic JSX element so it can be used directly in TSX. Its
// `emoji-click` event is a CustomEvent, so it is wired up via a ref rather than
// a JSX prop.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
