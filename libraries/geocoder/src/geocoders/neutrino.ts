import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface NeutrinoOptions extends GeocoderOptions {
  userId: string;
}

interface NeutrinoGeocodeResponse {
  locations?: Array<{
    latitude: number;
    longitude: number;
    address: string;
  }>;
  geometry?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface NeutrinoReverseResponse {
  status: {
    status: number;
  };
  found: boolean;
  address: string;
}

/**
 * Implementation of the [Neutrino API](https://www.neutrinoapi.com/api/geocode-address/)
 */
export const Neutrino: GeocoderBuilder = (
  options: Partial<NeutrinoOptions>,
) => {
  const mergedOptions = {
    userId: '',
    apiKey: '',
    serviceUrl: 'https://neutrinoapi.com/',
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params: Record<string, unknown> = {
      apiKey: mergedOptions.apiKey,
      userId: mergedOptions.userId,
      //get three words and make a dot based string
      address: query.split(/\s+/).join('.'),
    };

    const data = await getJSON<NeutrinoGeocodeResponse>(
      `${mergedOptions.serviceUrl}geocode-address`,
      params,
    );
    if (!data.locations) {
      return [];
    }
    data.geometry = data.locations[0];
    const center = {
      lat: data.geometry.latitude,
      lng: data.geometry.longitude,
    };
    const bbox: Bounds = [center, center];
    return [
      {
        name: data.geometry.address,
        bbox,
        center,
        properties: data.geometry,
      },
    ];
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params: Record<string, unknown> = {
        apiKey: mergedOptions.apiKey,
        userId: mergedOptions.userId,
        latitude: location.lat,
        longitude: location.lng,
      };

      const data = await getJSON<NeutrinoReverseResponse>(
        `${mergedOptions.serviceUrl}geocode-reverse`,
        params,
      );
      if (data.status.status !== 200 || !data.found) {
        return [];
      }
      const center = { lat: location.lat, lng: location.lng };
      const bbox: Bounds = [center, center];
      return [
        {
          name: data.address,
          bbox,
          center,
          properties: data,
        },
      ];
    },
  };
};
