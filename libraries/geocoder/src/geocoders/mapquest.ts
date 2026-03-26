import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface MapQuestOptions extends GeocoderOptions {}

interface MapQuestLocation {
  street: string;
  adminArea4: string;
  adminArea3: string;
  adminArea1: string;
  latLng: {
    lat: number;
    lng: number;
  };
}

interface MapQuestResponse {
  results: Array<{
    locations: MapQuestLocation[];
  }>;
}

/**
 * Implementation of the [MapQuest Geocoding API](http://developer.mapquest.com/web/products/dev-services/geocoding-ws)
 */
export const MapQuest: GeocoderBuilder = (
  options: Partial<MapQuestOptions>,
) => {
  const mergedOptions = {
    serviceUrl: 'https://www.mapquestapi.com/geocoding/v1',
    apiKey: '',
    ...options,
  };

  // MapQuest seems to provide URI encoded API keys,
  // so to avoid encoding them twice, we decode them here
  mergedOptions.apiKey = decodeURIComponent(mergedOptions.apiKey || '');

  const formatName = (...parts: string[]): string => {
    return parts.filter((s) => !!s).join(', ');
  };

  const parseResults = (data: MapQuestResponse): GeocodingResult[] => {
    const locations = data.results?.[0]?.locations || [];
    return locations.map((loc): GeocodingResult => {
      const center = { lat: loc.latLng.lat, lng: loc.latLng.lng };
      const bbox: Bounds = [center, center];
      return {
        name: formatName(
          loc.street,
          loc.adminArea4,
          loc.adminArea3,
          loc.adminArea1,
        ),
        bbox,
        center,
        properties: loc,
      };
    });
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params: Record<string, unknown> = {
      key: mergedOptions.apiKey,
      location: query,
      limit: 5,
      outFormat: 'json',
    };

    const data = await getJSON<MapQuestResponse>(
      `${mergedOptions.serviceUrl}/address`,
      params,
    );
    return parseResults(data);
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params: Record<string, unknown> = {
        key: mergedOptions.apiKey,
        location: `${location.lat},${location.lng}`,
        outputFormat: 'json',
      };

      const data = await getJSON<MapQuestResponse>(
        `${mergedOptions.serviceUrl}/reverse`,
        params,
      );
      return parseResults(data);
    },
  };
};
