import type { Tracker } from "./types";

export const trackPage = (tracker: Tracker, url: string) => {
    tracker.setCustomUrl(url);
    tracker.trackPageView();
}