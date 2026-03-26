export interface LatLng {
    lat: number;
    lng: number;
    alt?: number;
}

export type Bounds = [LatLng, LatLng];

export interface GeocodingResult {
    name: string;
    bbox: Bounds;
    center: LatLng;
    icon?: string;
    properties?: any;
}

/**
 * An interface implemented to respond to geocoding queries
 */
export interface Geocoder {
    /**
     * Performs a geocoding query and returns the results as promise
     * @param query the query
     * @param context the context for the query
     */
    geocode(query: string): Promise<GeocodingResult[]>;
    /**
     * Performs a geocoding query suggestion (this happens while typing) and returns the results as promise
     * @param query the query
     * @param context the context for the query
     */
    suggest?(query: string): Promise<GeocodingResult[]>;
    /**
     * Performs a reverse geocoding query and returns the results as promise
     * @param location the coordinate to reverse geocode
     * @param scale the map scale possibly used for reverse geocoding
     */
    reverse?(location: LatLng, scale: number): Promise<GeocodingResult[]>;
}

export interface GeocoderOptions {
    /**
     * URL of the service
     */
    serviceUrl?: string;
    /**
     * Additional URL parameters (strings) that will be added to geocoding requests
     */
    geocodingQueryParams?: Record<string, string>;
    /**
     * Additional URL parameters (strings) that will be added to reverse geocoding requests
     */
    reverseQueryParams?: Record<string, string>;

    apiKey?: string;
}

export interface GeocoderBuilder {
    (options: GeocoderOptions): Geocoder;
}

export type GeocoderType =
    | 'arcgis'
    | 'azure'
    | 'bing'
    | 'google'
    | 'here'
    | 'latlng'
    | 'mapbox'
    | 'mapquest'
    | 'neutrino'
    | 'nominatim'
    | 'open-location-code'
    | 'opencage'
    | 'photon'
    | 'pelias'
    | 'what3words';
