import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface AzureMapsOptions extends GeocoderOptions {
  apiKey: string;
}

interface AzureMapsResponse {
  summary: Summary;
  results: Result[];
}

interface Result {
  type: string;
  id: string;
  score: number;
  address: Address;
  position: Position;
  viewport: Viewport;
  entryPoints: EntryPoint[];
}

interface Address {
  streetNumber: string;
  streetName: string;
  municipalitySubdivision: string;
  municipality: string;
  countrySecondarySubdivision: string;
  countryTertiarySubdivision: string;
  countrySubdivisionCode: string;
  postalCode: string;
  extendedPostalCode: string;
  countryCode: string;
  country: string;
  countryCodeISO3: string;
  freeformAddress: string;
  countrySubdivisionName: string;
}

interface EntryPoint {
  type: string;
  position: Position;
}

interface Position {
  lat: number;
  lon: number;
}

interface Viewport {
  topLeftPoint: Position;
  btmRightPoint: Position;
}

interface Summary {
  query: string;
  queryType: string;
  queryTime: number;
  numResults: number;
  offset: number;
  totalResults: number;
  fuzzyLevel: number;
}

/**
 * Implementation of [Azure Maps Geocoding](https://www.microsoft.com/en-us/maps/azure/location-services/geocoding)
 *
 * https://learn.microsoft.com/en-us/rest/api/maps/search?view=rest-maps-1.0
 */
export const AzureMaps: GeocoderBuilder = (
  options: Partial<AzureMapsOptions>,
) => {
  const mergedOptions = {
    serviceUrl: 'https://atlas.microsoft.com/search',
    apiKey: '',
    ...options,
  };

  if (!mergedOptions.apiKey) {
    throw new Error('Azure Maps Geocoder requires an API key.');
  }

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      'api-version': '1.0',
      query,
      'subscription-key': mergedOptions.apiKey,
    };

    const data = await getJSON<AzureMapsResponse>(
      `${mergedOptions.serviceUrl}/address/json`,
      params,
    );
    return (data.results || []).map(
      (result): GeocodingResult => ({
        name: result.address.freeformAddress,
        bbox: [
          {
            lat: result.viewport.topLeftPoint.lat,
            lng: result.viewport.topLeftPoint.lon,
          },
          {
            lat: result.viewport.btmRightPoint.lat,
            lng: result.viewport.btmRightPoint.lon,
          },
        ],
        center: { lat: result.position.lat, lng: result.position.lon },
        properties: result,
      }),
    );
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params = {
        'api-version': '1.0',
        query: `${location.lat},${location.lng}`,
        'subscription-key': mergedOptions.apiKey,
      };

      const data = await getJSON<AzureMapsResponse>(
        `${mergedOptions.serviceUrl}/address/reverse/json`,
        params,
      );
      return (data.results || []).map(
        (result): GeocodingResult => ({
          name: result.address.freeformAddress,
          bbox: [
            {
              lat: result.viewport.topLeftPoint.lat,
              lng: result.viewport.topLeftPoint.lon,
            },
            {
              lat: result.viewport.btmRightPoint.lat,
              lng: result.viewport.btmRightPoint.lon,
            },
          ],
          center: { lat: location.lat, lng: location.lng },
          properties: result,
        }),
      );
    },
  };
};
