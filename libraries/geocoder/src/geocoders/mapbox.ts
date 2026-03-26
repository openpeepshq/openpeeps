import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface MapboxOptions extends GeocoderOptions {}

/**
 * Implementation of the [Mapbox Geocoding](https://www.mapbox.com/api-documentation/#geocoding)
 */
export const Mapbox: GeocoderBuilder = (options: Partial<MapboxOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://api.mapbox.com/geocoding/v5/mapbox.places/',
    apiKey: '',
    ...options,
  };

  const getProperties = (loc: Feature) => {
    const properties: Record<string, string> = {
      text: loc.text,
      address: loc.address,
    };

    (loc.context || []).forEach((context) => {
      const id = context.id.split('.')[0];
      properties[id] = context.text;

      // Get country code when available
      if (context.short_code) {
        properties.countryShortCode = context.short_code;
      }
    });
    return properties;
  };

  const parseResults = (data: MapboxResponse): GeocodingResult[] => {
    if (!data.features?.length) {
      return [];
    }
    return data.features.map((loc): GeocodingResult => {
      const center = { lat: loc.center[1], lng: loc.center[0] };
      let bbox: Bounds;
      if (loc.bbox) {
        bbox = [
          { lat: loc.bbox[1], lng: loc.bbox[0] },
          { lat: loc.bbox[3], lng: loc.bbox[2] },
        ];
      } else {
        bbox = [center, center];
      }
      return {
        name: loc.place_name,
        bbox,
        center,
        properties: loc,
      };
    });
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const url = `${mergedOptions.serviceUrl}${encodeURIComponent(query)}.json`;
    const params: Record<string, unknown> = {
      access_token: mergedOptions.apiKey,
    };

    if (
      params.proximity !== undefined &&
      typeof params.proximity === 'object'
    ) {
      const proximity = params.proximity as { lat: number; lng: number };
      if (proximity.lat !== undefined && proximity.lng !== undefined) {
        params.proximity = `${proximity.lng},${proximity.lat}`;
      }
    }

    const data = await getJSON<MapboxResponse>(url, params);
    return parseResults(data);
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const url = `${mergedOptions.serviceUrl}${location.lng},${location.lat}.json`;
      const params: Record<string, unknown> = {
        access_token: mergedOptions.apiKey,
      };

      const data = await getJSON<MapboxResponse>(url, params);
      return parseResults(data);
    },
  };
};

/**
 * @internal
 */
export interface MapboxResponse {
  type: string;
  query: string[];
  features: Feature[];
  attribution: string;
}

interface Feature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: Properties;
  text: string;
  place_name: string;
  matching_text: string;
  matching_place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  geometry: Geometry;
  address: string;
  context: Context[];
}

interface Context {
  id: string;
  text: string;
  wikidata?: string;
  short_code?: string;
}

interface Geometry {
  type: string;
  coordinates: number[];
  interpolated: boolean;
  omitted: boolean;
}

interface Properties {}
