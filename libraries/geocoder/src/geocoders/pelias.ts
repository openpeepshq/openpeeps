import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface PeliasOptions extends GeocoderOptions {}

interface PeliasResponse {
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
      bbox?: [number, number, number, number];
    };
    properties: {
      id: string;
      layer: string;
      source_id: string;
      name: string;
      confidence: number;
      match_type: string;
      accuracy: string;
      country: string;
      country_a: string;
      region: string;
      region_a: string;
      county: string;
      county_a: string;
      localadmin: string;
      locality: string;
      continent: string;
      label: string;
      [key: string]: unknown;
    };
  }>;
  geocoding: {
    version: string;
    attribution: string;
    query: Record<string, unknown>;
    warnings: string[];
    engine: {
      name: string;
      author: string;
      version: string;
    };
  };
}

/**
 * Implementation of the [Pelias](https://pelias.io/), [geocode.earth](https://geocode.earth/) geocoder (formerly Mapzen Search)
 */
export const Pelias: GeocoderBuilder = (options: Partial<PeliasOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://api.geocode.earth/v1',
    ...options,
  };

  const parseResults = (data: PeliasResponse): GeocodingResult[] => {
    return data.features.map((feature): GeocodingResult => {
      const center = {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      };

      let bbox: Bounds;
      if (feature.geometry.bbox) {
        bbox = [
          { lat: feature.geometry.bbox[1], lng: feature.geometry.bbox[0] },
          { lat: feature.geometry.bbox[3], lng: feature.geometry.bbox[2] },
        ];
      } else {
        bbox = [center, center];
      }

      return {
        name: feature.properties.label,
        center,
        bbox,
        properties: feature.properties,
      };
    });
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      api_key: mergedOptions.apiKey,
      text: query,
      ...mergedOptions.geocodingQueryParams,
    };

    const data = await getJSON<PeliasResponse>(
      `${mergedOptions.serviceUrl}/search`,
      params,
    );
    return parseResults(data);
  };

  const suggest = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      api_key: mergedOptions.apiKey,
      text: query,
      ...mergedOptions.geocodingQueryParams,
    };

    const data = await getJSON<PeliasResponse>(
      `${mergedOptions.serviceUrl}/autocomplete`,
      params,
    );
    return parseResults(data);
  };

  return {
    geocode,
    suggest,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params = {
        api_key: mergedOptions.apiKey,
        'point.lat': location.lat,
        'point.lon': location.lng,
        ...mergedOptions.geocodingQueryParams,
      };

      const data = await getJSON<PeliasResponse>(
        `${mergedOptions.serviceUrl}/reverse`,
        params,
      );
      return parseResults(data);
    },
  };
};

/**
 * Implementation of the [Openrouteservice](https://openrouteservice.org/dev/#/api-docs/geocode) geocoder
 */
export const Openrouteservice: GeocoderBuilder = (
  options: Partial<PeliasOptions>,
) => {
  return Pelias({
    serviceUrl: 'https://api.openrouteservice.org/geocode',
    ...options,
  });
};

export const GeocodeEarth = Pelias;
export const Mapzen = Pelias;
