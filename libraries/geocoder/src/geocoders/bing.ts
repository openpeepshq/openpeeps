import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface BingOptions extends GeocoderOptions {}

/**
 * Implementation of the [Bing Locations API](https://docs.microsoft.com/en-us/bingmaps/rest-services/locations/)
 *
 * Bing Maps for Enterprise is deprecated and will be retired.
 * Free (Basic) account customers can continue to use Bing Maps for Enterprise services until June 30th, 2025.
 * Enterprise account customers can continue to use Bing Maps for Enterprise services until June 30th, 2028.
 */
export const Bing: GeocoderBuilder = (options: Partial<BingOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://dev.virtualearth.net/REST/v1/Locations/',
    apiKey: '',
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      query,
      key: mergedOptions.apiKey,
    };

    const data = await getJSON<BingResponse>(mergedOptions.serviceUrl, params);
    return data.resourceSets[0].resources.map((resource): GeocodingResult => {
      const bbox = resource.bbox;
      return {
        name: resource.name,
        bbox: [
          { lat: bbox[0], lng: bbox[1] },
          { lat: bbox[2], lng: bbox[3] },
        ],
        center: {
          lat: resource.point.coordinates[0],
          lng: resource.point.coordinates[1],
        },
        properties: resource,
      };
    });
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params = {
        key: mergedOptions.apiKey,
      };

      const data = await getJSON<BingResponse>(
        `${mergedOptions.serviceUrl}${location.lat},${location.lng}`,
        params,
      );

      return data.resourceSets[0].resources.map((resource): GeocodingResult => {
        const bbox = resource.bbox;
        return {
          name: resource.name,
          bbox: [
            { lat: bbox[0], lng: bbox[1] },
            { lat: bbox[2], lng: bbox[3] },
          ],
          center: {
            lat: resource.point.coordinates[0],
            lng: resource.point.coordinates[1],
          },
          properties: resource,
        };
      });
    },
  };
};

/**
 * @internal
 */
interface BingResponse {
  resourceSets: Array<{
    resources: Array<{
      name: string;
      point: {
        coordinates: [number, number];
      };
      bbox: [number, number, number, number];
    }>;
  }>;
}
