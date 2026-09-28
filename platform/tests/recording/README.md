# Jam Recording Upload Test

A Playwright test that verifies jam recordings are properly uploaded to an
OpenPeeps instance after multiple start/stop cycles.

## Prerequisites

- An OpenPeeps instance with **signups open** and **LiveKit jams enabled**
  (configured server-side via `JAMS_LIVEKIT_URL` / `API_KEY` / `API_SECRET`).
- The instance must be reachable from the machine running the test.
- Playwright browsers installed: `npx playwright install chromium`.

## Environment Variables

| Variable                      | Default                 | Description                                  |
| ----------------------------- | ----------------------- | -------------------------------------------- |
| `PLAYWRIGHT_BASE_URL`         | `http://localhost:5173` | Base URL of the OpenPeeps web client.        |
| `RECORDING_TEST_USERS`        | `3`                     | Number of participant users to register.     |
| `RECORDING_TEST_DURATION_SEC` | `30`                    | Seconds each recording runs before stopping. |
| `RECORDING_TEST_CYCLES`       | `3`                     | Number of start/stop recording cycles.       |
| `RECORDING_TEST_PASSWORD`     | `rec-test-pw`           | Shared password for all test accounts.       |

> **Note:** LiveKit credentials (`JAMS_LIVEKIT_*`) are **server-side** config.
> The test does not need them — it queries `/server/info` to check whether
> LiveKit jams are enabled on the target instance.

## Running

```bash
# From the repository root:
cd platform/tests

# Basic run (3 users, 30s recordings, 3 cycles):
PLAYWRIGHT_BASE_URL=http://localhost:5173 \
npx playwright test recording/recording.test.ts --project=chromium --headed
```

### Custom parameters

```bash
RECORDING_TEST_USERS=5 \
RECORDING_TEST_DURATION_SEC=60 \
RECORDING_TEST_CYCLES=5 \
npx playwright test recording/recording.test.ts
```

## What the test does

1. **Registers users** — Creates a moderator account plus N participant accounts
   via the `/auth/register` API endpoint.
2. **Creates a jam** — The moderator creates a video-call jam event via
   `/posts`.
3. **Connects users via Playwright** — Each user (including the moderator)
   navigates to `/events/{jamId}/jam` in a browser, sets their auth token in
   `localStorage`, and clicks the lobby "Start" button to join the LiveKit room.
4. **Recording cycles** — For each cycle:
   - Starts recording via `POST /jams/{jamId}/recordings` (API).
   - Waits for the configured duration.
   - Stops recording via `PUT /jams/{jamId}/recordings/stop` (API).
5. **5-minute settle** — Waits 5 minutes for LiveKit egress uploads to
   complete and the worker to mark recordings as `completed`.
6. **Verifies uploads** — Fetches `GET /posts/{jamId}/recordings` and asserts
   that every recording has `status: "completed"` and a non-empty `attachment`.

## Notes

- The test uses the **API** for recording start/stop (not UI clicks) because
  the record button is moderator-only and API calls are more deterministic.
- The test uses **Playwright browser automation** for joining the jam, as
  requested — each user gets a real browser page that connects to LiveKit.
- If LiveKit is not enabled on the target instance (checked via
  `/server/info`), the test fails with a clear message.
- The 5-minute wait is configurable only by editing the test; it is
  intentionally long to allow egress uploads to finish on slower hardware.
