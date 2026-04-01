export interface Tracker {
    trackPageView: (customTitle?: string) => void;
    trackEvent: (
        category: string,
        action: string,
        name?: string,
        value?: number,
    ) => void;
    trackSiteSearch: (
        keyword: string,
        category?: string,
        resultsCount?: number,
    ) => void;
    enableHeartBeatTimer: (activeTimeInSeconds?: number) => void;
    enableLinkTracking: (enable?: boolean) => void;
    setCustomUrl: (url: string) => void;
    setDoNotTrack: (bool: boolean) => void;
    setCustomDimension: (dimensionID: number, value: string) => void;
    requireConsent: () => void;
    disableCookies: () => void;
    enableCrossDomainLinking: () => void;
    setDomains: (domains: string[]) => void;
}

export interface Window {
    Matomo: Matomo;
}

export interface Matomo {
    getTracker: (url: string, siteId: number) => Tracker;
    set: (tracker: Tracker) => void;
}