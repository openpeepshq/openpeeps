import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface PhotonOptions extends GeocoderOptions {
  reverseUrl: string;
  nameProperties: string[];
}

interface PhotonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: PhotonProperties;
}

interface PhotonProperties {
  osm_id: number;
  osm_type: string;
  extent?: number[];
  country: string;
  osm_key: string;
  city: string;
  countrycode: string;
  osm_value: string;
  name: string;
  state: string;
  type: string;
  postcode?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  [key: string]: string | number | number[] | undefined;
}

interface PhotonResponse {
  type: string;
  features: PhotonFeature[];
}

/**
 * Implementation of the [Photon](http://photon.komoot.io/) geocoder
 */
export const Photon: GeocoderBuilder = (options: Partial<PhotonOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://photon.komoot.io/api/',
    reverseUrl: 'https://photon.komoot.io/reverse/',
    nameProperties: [
      'name',
      'street',
      'suburb',
      'hamlet',
      'town',
      'city',
      'state',
      'country',
    ],
    ...options,
  };

  const decodeFeatureName = (f: PhotonFeature): string => {
    return (mergedOptions.nameProperties || [])
      .map((p) => f.properties?.[p])
      .filter((v) => !!v)
      .join(', ');
  };

  const parseResults = (data: PhotonResponse): GeocodingResult[] => {
    return (data.features || []).map((f): GeocodingResult => {
      const c = f.geometry.coordinates;
      const center = { lat: c[1], lng: c[0] };
      const extent = f.properties?.extent;

      const bbox: Bounds = extent
        ? [
          { lat: extent[1], lng: extent[0] },
          { lat: extent[3], lng: extent[2] },
        ]
        : [center, center];

      return {
        name: decodeFeatureName(f),
        center,
        bbox,
        properties: f.properties,
      };
    });
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      q: query,
    };

    const data = await getJSON<PhotonResponse>(
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
        lat: location.lat,
        lon: location.lng,
      };

      const data = await getJSON<PhotonResponse>(
        mergedOptions.reverseUrl,
        params,
      );
      return parseResults(data);
    },
  };
};
