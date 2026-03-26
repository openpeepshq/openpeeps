import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface What3WordsOptions extends GeocoderOptions {}

interface What3WordsResponse {
  geometry: {
    lat: number;
    lng: number;
  };
  words: string;
  status?: {
    status: number;
  };
}

/**
 * Implementation of the [What3Words service](https://what3words.com/)
 */
export const What3Words: GeocoderBuilder = (
  options: Partial<What3WordsOptions>,
) => {
  const mergedOptions = {
    serviceUrl: 'https://api.what3words.com/v2/',
    apiKey: '',
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const data = await getJSON<What3WordsResponse>(
      `${mergedOptions.serviceUrl}forward`,
      {
        key: mergedOptions.apiKey,
        //get three words and make a dot based string
        addr: query.split(/\s+/).join('.'),
      },
    );

    if (!data.geometry) {
      return [];
    }

    const center = { lat: data.geometry.lat, lng: data.geometry.lng };
    const bbox: Bounds = [center, center];

    return [
      {
        name: data.words,
        bbox,
        center,
        properties: data,
      },
    ];
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const data = await getJSON<What3WordsResponse>(
        `${mergedOptions.serviceUrl}reverse`,
        {
          key: mergedOptions.apiKey,
          coords: [location.lat, location.lng].join(','),
        },
      );

      if (data.status?.status !== 200) {
        return [];
      }

      const center = { lat: data.geometry.lat, lng: data.geometry.lng };
      const bbox: Bounds = [center, center];

      return [
        {
          name: data.words,
          bbox,
          center,
          properties: data,
        },
      ];
    },
  };
};
