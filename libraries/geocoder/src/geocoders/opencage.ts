import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface OpenCageOptions extends GeocoderOptions {}

interface OpenCageResponse {
  results: Array<{
    formatted: string;
    geometry: {
      lat: number;
      lng: number;
    };
    annotations?: {
      bounds?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
    [key: string]: unknown;
  }>;
}

/**
 * Implementation of the [OpenCage Data API](https://opencagedata.com/)
 */
export const OpenCage: GeocoderBuilder = (
  options: Partial<OpenCageOptions>,
) => {
  const mergedOptions = {
    serviceUrl: 'https://api.opencagedata.com/geocode/v1/json',
    ...options,
  };

  const parseResults = (data: OpenCageResponse): GeocodingResult[] => {
    return (data.results || []).map((loc): GeocodingResult => {
      const center = { lat: loc.geometry.lat, lng: loc.geometry.lng };
      const bbox: Bounds = loc.annotations?.bounds
        ? [
            {
              lat: loc.annotations.bounds.southwest.lat,
              lng: loc.annotations.bounds.southwest.lng,
            },
            {
              lat: loc.annotations.bounds.northeast.lat,
              lng: loc.annotations.bounds.northeast.lng,
            },
          ]
        : [center, center];

      return {
        name: loc.formatted,
        bbox,
        center,
        properties: loc,
      };
    });
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      key: mergedOptions.apiKey,
      q: query,
      ...mergedOptions.geocodingQueryParams,
    };

    const data = await getJSON<OpenCageResponse>(
      mergedOptions.serviceUrl,
      params,
    );
    return parseResults(data);
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params = {
        key: mergedOptions.apiKey,
        q: `${location.lat},${location.lng}`,
        ...mergedOptions.geocodingQueryParams,
      };

      const data = await getJSON<OpenCageResponse>(
        mergedOptions.serviceUrl,
        params,
      );
      return parseResults(data);
    },
  };
};
