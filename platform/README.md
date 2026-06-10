# openpeeps Platform

The packages in this folder comprise the building blocks for
the openpeeps Community Server. They are also starting points
for developing plugins or other integrations with openpeeps.

## Core components

### server

The openpeeps Community Server runtime.

### web

`@openpeeps/web` — the assembled web application and the primary
frontend for the openpeeps server. A Vite + React single-page app
that consumes the API and serves the SPA.

### react

`@openpeeps/react` — shared React components and hooks used by
`@openpeeps/web` and downstream consumers to build frontends for the
openpeeps server.

## Supporting packages

### cli

The command line interface to an openpeeps server.

### client

A typescript client library for the openpeeps api.

### common

Types and utilities used by multiple parts of the openpeeps server.

### core

Basic interactions with the database and other logic running
on the backend.

### interactions

Default emails and notifications.

### react-native

React Native components and utilities for native mobile apps.

## Deprecated

The frontend is now React (Vite + React SPA). The following SvelteKit
packages are legacy, deprecated, and kept only until the remaining stubs
in `@openpeeps/web` are ported — do not use them for new work.

### app

`@openpeeps/app` — the previous SvelteKit application. Superseded by the
React `web` app.

### svelte

`@openpeeps/svelte` — legacy Svelte components and utilities. Superseded
by `react`.
