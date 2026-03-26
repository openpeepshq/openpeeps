import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export type NominatimResponse = NominatimResult[];

export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  importance?: number;
  icon?: string;
  address: NominatimAddress;
}

export interface NominatimAddress {
  building?: string;
  city_district?: string;
  city?: string;
  country_code?: string;
  country?: string;
  county?: string;
  hamlet?: string;
  house_number?: string;
  neighbourhood?: string;
  postcode?: string;
  road?: string;
  state_district?: string;
  state?: string;
  suburb?: string;
  village?: string;
}

export interface NominatimOptions extends GeocoderOptions {
  /**
   * Additional URL parameters (strings) that will be added to geocoding requests; can be used to restrict results to a specific country for example, by providing the [`countrycodes`](https://wiki.openstreetmap.org/wiki/Nominatim#Parameters) parameter to Nominatim
   */
  geocodingQueryParams?: Record<string, string>;
  /**
   * A function that takes an GeocodingResult as argument and returns an HTML formatted string that represents the result. Default function breaks up address in parts from most to least specific, in attempt to increase readability compared to Nominatim's naming
   */
  htmlTemplate: (r: NominatimResult) => string;
}

/**
 * Implementation of the [Nominatim](https://wiki.openstreetmap.org/wiki/Nominatim) geocoder.
 *
 * This is the default geocoding service used by the control, unless otherwise specified in the options.
 *
 * Unless using your own Nominatim installation, please refer to the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
 */
export const Nominatim: GeocoderBuilder = (
  options: Partial<NominatimOptions>,
) => {
  const mergedOptions = {
    serviceUrl: 'https://nominatim.openstreetmap.org/',
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params: Record<string, unknown> = {
      q: query,
      limit: 5,
      format: 'json',
      addressdetails: 1,
      apiKey: mergedOptions.apiKey,
      ...mergedOptions.geocodingQueryParams,
    };

    const data = await getJSON<NominatimResult[]>(
      `${mergedOptions.serviceUrl}search`,
      params,
    );
    return data.map((item): GeocodingResult => {
      const bbox = item.boundingbox;
      return {
        icon: item.icon,
        name: item.display_name,
        bbox: [
          { lat: +bbox[0], lng: +bbox[2] },
          { lat: +bbox[1], lng: +bbox[3] },
        ],
        center: { lat: +item.lat, lng: +item.lon },
        properties: item,
      };
    });
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params: Record<string, unknown> = {
        lat: location.lat,
        lon: location.lng,
        zoom: Math.round(Math.log(256 / 256) / Math.log(2)), // Default scale of 256
        addressdetails: 1,
        format: 'json',
        ...mergedOptions.geocodingQueryParams,
      };

      const data = await getJSON<NominatimResult>(
        `${mergedOptions.serviceUrl}reverse`,
        params,
      );
      if (!data?.lat || !data?.lon) {
        return [];
      }
      const center = { lat: +data.lat, lng: +data.lon };
      const bbox: Bounds = [center, center];
      return [
        {
          name: data.display_name,
          center,
          bbox,
          properties: data,
        },
      ];
    },
  };
};
