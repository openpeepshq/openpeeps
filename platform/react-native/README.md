# @openpeepshq/react-native

React Native **screens and shared UI** used by OpenPeeps community apps. This package contains code extracted from the Black Ambition community app (`screens/`, `components/`, plus supporting `lib/`, `stores/`, `hooks/`, `theme/`, `contexts/`, `i18n/`, etc.).

## Installation

Host applications must provide the same **peer dependencies** as a full community client (React Navigation, NativeWind, `@openpeepshq/common`, `@openpeepshq/react`, LiveKit, cameras, etc.). See `package.json` → `peerDependencies`.

```sh
pnpm add @openpeepshq/react-native
```

Wrap your app with **`OpenpeepsProvider`** from `@openpeepshq/react-native` (and a credentials store + `baseUrl`) so `useOpenpeeps()` and theme code work. This re-exports the web provider from `@openpeepshq/react` with React Native `AppState` foreground handling wired in — do not import `OpenpeepsProvider` from `@openpeepshq/react` in native apps.

Configure **NativeWind** / Tailwind in the app (including this package in Tailwind `content` if needed), load `src/global.css` from your entry, and supply **`react-native-config`** (or compatible env) for `BASE_URL` and related keys used by `~/lib/constants`.

## Usage

```tsx
import {
  Login,
  Home,
  OpenPeepsThemeProvider,
  useAppImagesStore,
} from '@openpeepshq/react-native';
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
