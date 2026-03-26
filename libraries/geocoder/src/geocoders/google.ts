import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

/**
 * Implementation of the [Google Geocoding API](https://developers.google.com/maps/documentation/geocoding/)
 */
export interface GoogleOptions extends GeocoderOptions {}

export const Google: GeocoderBuilder = (options: Partial<GoogleOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
    apiKey: '',
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      key: mergedOptions.apiKey,
      address: query,
    };

    const data = await getJSON<GoogleResponse>(
      mergedOptions.serviceUrl,
      params,
    );
    return (data.results || []).map((loc): GeocodingResult => {
      const center = {
        lat: loc.geometry.location.lat,
        lng: loc.geometry.location.lng,
      };
      const bbox: Bounds = [
        {
          lat: loc.geometry.viewport.southwest.lat,
          lng: loc.geometry.viewport.southwest.lng,
        },
        {
          lat: loc.geometry.viewport.northeast.lat,
          lng: loc.geometry.viewport.northeast.lng,
        },
      ];
      return {
        name: loc.formatted_address,
        bbox,
        center,
        properties: loc,
      };
    });
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params = {
        key: mergedOptions.apiKey,
        latlng: `${location.lat},${location.lng}`,
      };

      const data = await getJSON<GoogleResponse>(
        mergedOptions.serviceUrl,
        params,
      );
      return (data.results || []).map((loc): GeocodingResult => {
        const center = {
          lat: loc.geometry.location.lat,
          lng: loc.geometry.location.lng,
        };
        const bbox: Bounds = [
          {
            lat: loc.geometry.viewport.southwest.lat,
            lng: loc.geometry.viewport.southwest.lng,
          },
          {
            lat: loc.geometry.viewport.northeast.lat,
            lng: loc.geometry.viewport.northeast.lng,
          },
        ];
        return {
          name: loc.formatted_address,
          bbox,
          center,
          properties: loc,
        };
      });
    },
  };
};

/**
 * @internal
 */
export interface GoogleResponse {
  results: Result[];
  status: string;
}

interface Result {
  address_components: AddressComponent[];
  formatted_address: string;
  geometry: Geometry;
  place_id: string;
  types: string[];
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface Geometry {
  bounds: Viewport;
  location: Location;
  location_type: string;
  viewport: Viewport;
}

interface Viewport {
  northeast: Location;
  southwest: Location;
}

interface Location {
  lat: number;
  lng: number;
}
