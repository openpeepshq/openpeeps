# @openpeeps/react-ui

OpenPeeps React UI library. A 1:1 React + shadcn/Tailwind translation of
[`@openpeeps/ui`](../ui) (Svelte + Skeleton).

## What's inside

| @openpeeps/ui (Svelte)     | @openpeeps/react-ui (React)                     |
| -------------------------- | ----------------------------------------------- |
| `badges/`                  | `Badge`, `Badges`                               |
| `button/`                  | `Button`, `IconButton`, `TextButton`            |
| `date/`                    | `UpdatingDate`, `StopWatch`, `Timespan`         |
| `expandable-box/`          | `ExpandableBox`                                 |
| `form/`                    | `Form`, `FormInput`, `Label`, `RadioSelect`, `FormRadioBool`, `SubmitButton`, `useFormContext`, `useFormMessages`, helpers |
| `icons/`                   | `Blur`                                          |
| `infinite-scrolling/`      | `InfiniteScrollContainer`, `ScrollObserver`     |
| `link/`                    | `Link`                                          |
| `loaders/`                 | `Loader`, `LoadingIcon`, `WaitForQueries`       |
| `modal/`                   | `Modal`, `ModalWrapper`, `ModalHeader`, `ModalFooter`, `getModalManager`, `useModalManager` |
| `popup-menu/`              | `PopupMenu`, `PopupMenuButton`, `PopupSection`, `PopupSeparator` |
| `search/`                  | `SearchAndFilterBar`                            |
| `table/`                   | `Table`                                         |
| `theme/`                   | `generatePalette`, `setTheme`, color utilities  |
| `tooltip/`                 | `Tooltip`                                       |
| `utils/`                   | `cn`, `deepGet`, `deepSet`, `getUniqueBy`, `preventDefault`, `stopPropagation`, `useInfiniteScroll` |

In addition the package exposes shadcn primitives directly (`Input`,
`Textarea`, `Dialog*`, `DropdownMenu*`, `Popover*`, `RadioGroup`, `Tooltip*`,
`Table*`, `ScrollArea`, `Separator`, `Skeleton`, `ShadcnButton`,
`ShadcnBadge`, …).

## Install

```bash
pnpm add @openpeeps/react-ui
```

Peer deps: `react`, `react-dom`, `@tanstack/react-query`.

## Tailwind setup

Extend the bundled preset from your app's `tailwind.config.cjs`:

```js
module.exports = {
  presets: [require('@openpeeps/react-ui/tailwind-preset')],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@openpeeps/react-ui/dist/**/*.{js,mjs}',
  ],
};
```

Then import the bundled stylesheet once at your app entry:

```ts
import '@openpeeps/react-ui/styles.css';
```

## Theming

Themes are CSS-variable based, mirroring Skeleton. Set the active theme by
toggling `data-theme` on the `<body>`:

```ts
import { setTheme } from '@openpeeps/react-ui';
setTheme('OpenpeepsLight'); // or 'OpenpeepsDark'
```

To produce CSS overrides for a custom primary color use:

```ts
import { themeStyleString } from '@openpeeps/react-ui';
const css = themeStyleString('OpenpeepsLight', '#55ACBA', '/bg.png');
```

## Forms

```tsx
import { Form, FormInput, SubmitButton } from '@openpeeps/react-ui';
import { z } from 'zod';

const Schema = z.object({ email: z.string().email() });

<Form data={state} schema={Schema} onSubmit={(d) => save(d)}>
  <FormInput path={['email']} title="Email" type="email" />
  <SubmitButton title="Save" action={() => save(state)} />
</Form>;
```

## Modals

Mount once near the root of your app:

```tsx
import { Modal } from '@openpeeps/react-ui';

<App>
  <Modal />
</App>;
```

Trigger from anywhere — even outside React — with `getModalManager()`:

```ts
import { getModalManager } from '@openpeeps/react-ui';
const m = getModalManager();
m.show(MyModal, { foo: 'bar' }, (response) => console.log(response));
```
