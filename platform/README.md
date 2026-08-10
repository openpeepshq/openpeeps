# openpeeps Platform

The packages in this folder comprise the building blocks for
the openpeeps Community Server. They are also starting points
for developing plugins or other integrations with openpeeps.

## Core components

### server

The openpeeps Community Server runtime (Express + Riddl API, React Email
templates under `src/emails`, and the BullMQ worker entrypoint).

### web

`@openpeepshq/web` — the assembled web application and the primary
frontend for the openpeeps server. A Vite + React single-page app
that consumes the API and serves the SPA.

### react

`@openpeepshq/react` — shared React components and hooks used by
`@openpeepshq/web` and downstream consumers to build frontends for the
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

### i18n

Locale files and translation helpers for user-facing copy.

### react-native

React Native components and utilities for native mobile apps.

### worker

BullMQ job definitions consumed by the server worker entrypoint
(notifications, media, emails, events).
