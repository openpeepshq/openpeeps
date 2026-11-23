/**
 * Maximum width (px) we store header/banner images at.
 *
 * Intentionally larger than the web center column (~669px) to leave headroom
 * for other clients and future layout changes. Header uploads are cropped to
 * their aspect ratio and then scaled down to this width if necessary (never
 * upscaled), which keeps banners sharp without bloating storage.
 */
export const HEADER_IMAGE_MAX_WIDTH = 800;

/** Aspect ratio used for event/article header banners. */
export const EVENT_HEADER_ASPECT_RATIO = '16:9';

/**
 * Aspect ratio for profile/group cover banners. Uploads are cropped to this
 * ratio; display containers use the same ratio. Banners that arrive with a
 * different ratio (federation or older uploads) are shown with `object-cover`
 * so they fill the 3:1 banner (center-cropped) rather than being letterboxed
 * with grey gaps.
 */
export const PROFILE_GROUP_HEADER_ASPECT_RATIO = '3:1';

/**
 * Max duration (seconds) of voice notes recorded in the post composers.
 * Enforced on the client (web modal + RN sheet) and re-checked server-side
 * during media processing, so it is the single source of truth for the cap.
 *
 * Boundary rule — clients auto-stop at `VOICE_NOTE_AUTO_STOP_SECONDS`, the
 * server rejects with `>`: the recorders tick every 500 ms and the stop check
 * runs against the *raw* wall-clock span, so a take can finish anywhere in
 * [90.0 s, 90.5 s). The file's probed duration is that raw span, so stopping
 * at exactly 90 s would let roughly half of honest cap-length takes probe
 * above the server's `duration > 90` check and surface the 400 right after
 * the recorder stopped itself. Auto-stopping at 89.5 s keeps every honest
 * take strictly under 90 s (≤ 89.999 s), while a genuinely-overshot or
 * crafted upload (≥ 90.5 s) still probes above the cap and is rejected —
 * the two sides are pinned by tests (`transcodeAudio.test.ts`,
 * `mediaDimensions.test.ts`, `VoiceRecorderModal.test.tsx`,
 * `record-audio-sheet.test.tsx`) so they cannot drift apart — change either
 * the threshold or the server operator only together with those tests.
 */
export const VOICE_NOTE_MAX_SECONDS = 90;

/**
 * The wall-clock moment the recorders auto-stop. Half a second *under*
 * VOICE_NOTE_MAX_SECONDS: the coarse 500 ms tick that detects the threshold
 * guarantees the actual file stays under the cap (see above), which is what
 * makes the server's `duration > VOICE_NOTE_MAX_SECONDS` boundary safe for
 * honest takes.
 */
export const VOICE_NOTE_AUTO_STOP_SECONDS = VOICE_NOTE_MAX_SECONDS - 0.5;
