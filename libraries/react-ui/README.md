# @openpeepshq/react-ui

OpenPeeps React UI library. A 1:1 React + shadcn/Tailwind translation of
[`@openpeepshq/ui`](../ui) (Svelte + Skeleton).

## What's inside

| @openpeepshq/ui (Svelte) | @openpeepshq/react-ui (React)                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `badges/`                | `Badge`, `Badges`                                                                                                          |
| `button/`                | `Button`, `IconButton`, `TextButton`                                                                                       |
| `date/`                  | `UpdatingDate`, `StopWatch`, `Timespan`                                                                                    |
| `expandable-box/`        | `ExpandableBox`                                                                                                            |
| `form/`                  | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `Label`, `RadioSelect` |
| `icons/`                 | `Blur`                                                                                                                     |
| `infinite-scrolling/`    | `InfiniteScrollContainer`, `ScrollObserver`                                                                                |
| `link/`                  | `Link`                                                                                                                     |
| `loaders/`               | `Loader`, `LoadingIcon`, `WaitForQueries`                                                                                  |
| `modal/`                 | `Modal`, `ModalWrapper`, `ModalHeader`, `ModalFooter`, `getModalManager`, `useModalManager`                                |
| `popup-menu/`            | `PopupMenu`, `PopupMenuButton`, `PopupSection`, `PopupSeparator`                                                           |
| `search/`                | `SearchAndFilterBar`                                                                                                       |
| `table/`                 | `Table`                                                                                                                    |
| `theme/`                 | `applyThemeOverrides`, `setTheme`, color utilities                                                                         |
| `tooltip/`               | `Tooltip`                                                                                                                  |
| `utils/`                 | `cn`, `deepGet`, `deepSet`, `getUniqueBy`, `preventDefault`, `stopPropagation`, `useInfiniteScroll`                        |

In addition the package exposes shadcn primitives directly (`Input`,
`Textarea`, `Dialog*`, `DropdownMenu*`, `Popover*`, `RadioGroup`, `Tooltip*`,
`Table*`, `ScrollArea`, `Separator`, `Skeleton`, `ShadcnBadge`, …).

## Install

```bash
pnpm add @openpeepshq/react-ui
```

Peer deps: `react`, `react-dom`, `@tanstack/react-query`.

## Tailwind setup

Extend the bundled preset from your app's `tailwind.config.cjs`:

```js
module.exports = {
  presets: [require('@openpeepshq/react-ui/tailwind-preset')],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@openpeepshq/react-ui/dist/**/*.{js,mjs}',
  ],
};
```

Then import the bundled stylesheet once at your app entry:

```ts
import '@openpeepshq/react-ui/styles.css';
```

## Theming

Themes are CSS-variable based, mirroring Skeleton. Set the active theme by
toggling `data-theme` on the `<body>`:

```ts
import { setTheme } from '@openpeepshq/react-ui';
setTheme('OpenpeepsLight'); // or 'OpenpeepsDark'
```

To produce CSS overrides for a custom primary color use:

```ts
import { themeStyleString } from '@openpeepshq/react-ui';
const css = themeStyleString('OpenpeepsLight', '#55ACBA', '/bg.png');
```

## Forms

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
} from '@openpeepshq/react-ui';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

<Form {...form}>
  <form onSubmit={form.handleSubmit(save)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} type="email" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Save</Button>
  </form>
</Form>;
```

## Modals

Mount once near the root of your app:

```tsx
import { Modal } from '@openpeepshq/react-ui';

<App>
  <Modal />
</App>;
```

Trigger from anywhere — even outside React — with `getModalManager()`:

```ts
import { getModalManager } from '@openpeepshq/react-ui';
const m = getModalManager();
m.show(MyModal, { foo: 'bar' }, (response) => console.log(response));
```
