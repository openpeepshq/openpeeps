# @openpeepshq/rn-components

React Native **screens and shared UI** used by OpenPeeps community apps. This package contains code extracted from the Black Ambition community app (`screens/`, `components/`, plus supporting `lib/`, `stores/`, `hooks/`, `theme/`, `contexts/`, `i18n/`, etc.).

Formerly published as `@openpeepshq/react-native`. The rename avoids NativeWind's css-interop Babel skip regex, which treats any `react-native` path segment as `node_modules/react-native` and left community UIs unstyled.

## Installation

Host applications must provide the same **peer dependencies** as a full community client (React Navigation, NativeWind, `@openpeepshq/common`, `@openpeepshq/react`, LiveKit, cameras, etc.). See `package.json` → `peerDependencies`.

```sh
pnpm add @openpeepshq/rn-components
```

Wrap your app with **`OpenpeepsProvider`** from `@openpeepshq/rn-components` (and a credentials store + `baseUrl`) so `useOpenpeeps()` and theme code work. This re-exports the web provider from `@openpeepshq/react` with React Native `AppState` foreground handling wired in — do not import `OpenpeepsProvider` from `@openpeepshq/react` in native apps.

Configure **NativeWind** / Tailwind in the app (include this package in Tailwind `content`), load `src/global.css` from your entry, and supply **`react-native-config`** (or compatible env) for `BASE_URL` and related keys used by `~/lib/constants`.

Wrap Metro with **`withOpenPeepsMetro`** (outside `withNativeWind`) so css-interop observables defer on React 19. Hosts should not patch `react-native-css-interop`.

```js
const { withNativeWind } = require('nativewind/metro');
const { withOpenPeepsMetro } = require('@openpeepshq/rn-components/metro');

module.exports = withOpenPeepsMetro(
  withNativeWind(config, { input: './src/global.css' }),
);
```

## Usage

```tsx
import {
  Login,
  Home,
  OpenPeepsThemeProvider,
  useAppImagesStore,
} from '@openpeepshq/rn-components';
```

Wire navigators and providers in your app root (the previous template’s single native view component has been removed; this is a **JavaScript-only** library).

## Local development (this monorepo)

`@openpeepshq/common` and `@openpeepshq/react` are **workspace** dependencies (`workspace:^` in `devDependencies`). Run `pnpm install` from the `openpeeps` repository root so they resolve; the lockfile is `openpeeps/pnpm-lock.yaml`.

## Building

```sh
pnpm install
pnpm run typecheck
pnpm run build
```

Built output is written to `lib/` (CommonJS, ESM, and TypeScript declarations).

## License

MIT

---

Based on [create-react-native-library](https://github.com/callstack/react-native-builder-bob) (react-native-builder-bob).
