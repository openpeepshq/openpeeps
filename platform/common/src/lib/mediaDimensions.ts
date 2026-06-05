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
