import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

export interface HereOptions extends GeocoderOptions {
  /**
   * Use `apiKey` and the new `HEREv2` geocoder
   * @deprecated
   */
  app_id: string;
  /**
   * Use `apiKey` and the new `HEREv2` geocoder
   * @deprecated
   */
  app_code: string;
  reverseGeocodeProxRadius?: any;
  apiKey: string;
  maxResults: number;
}

interface HereV2Params {
  q: string;
  apiKey: string;
  limit: number;
  at?: string;
  in?: string;
}

interface HereV1Result {
  location: {
    displayPosition: {
      latitude: number;
      longitude: number;
    };
    mapView: {
      topLeft: {
        latitude: number;
        longitude: number;
      };
      bottomRight: {
        latitude: number;
        longitude: number;
      };
    };
    address: {
      label: string;
      [key: string]: any;
    };
  };
}

interface HereV1Response {
  response: {
    view: Array<{
      result: HereV1Result[];
    }>;
  };
}

/**
 * Implementation of the new [HERE Geocoder API](https://developer.here.com/documentation/geocoding-search-api/api-reference-swagger.html)
 */
export const HEREv2: GeocoderBuilder = (options: Partial<HereOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://geocode.search.hereapi.com/v1',
    apiKey: '',
    app_id: '',
    app_code: '',
    maxResults: 10,
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const typedParams: HereV2Params = {
      q: query,
      apiKey: mergedOptions.apiKey,
      limit: mergedOptions.maxResults,
    };

    const params: Record<string, unknown> = { ...typedParams };

    if (!params.at && !params.in) {
      throw Error(
        'at / in parameters not found. Please define coordinates (at=latitude,longitude) or other (in) in your geocodingQueryParams.',
      );
    }

    const data = await getJSON<HEREv2Response>(
      `${mergedOptions.serviceUrl}/discover`,
      params,
    );
    return (data.items || []).map((item): GeocodingResult => {
      const center = { lat: item.position.lat, lng: item.position.lng };
      let bbox: Bounds;
      if (item.mapView) {
        bbox = [
          { lat: item.mapView.south, lng: item.mapView.west },
          { lat: item.mapView.north, lng: item.mapView.east },
        ];
      } else {
        // Using only position when not provided
        bbox = [
          { lat: item.position.lat, lng: item.position.lng },
          { lat: item.position.lat, lng: item.position.lng },
        ];
      }
      return {
        name: item.address.label,
        properties: item,
        bbox,
        center,
      };
    });
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params: Record<string, unknown> = {
        at: `${location.lat},${location.lng}`,
        limit: mergedOptions.reverseGeocodeProxRadius,
        apiKey: mergedOptions.apiKey,
      };

      const data = await getJSON<HEREv2Response>(
        `${mergedOptions.serviceUrl}/revgeocode`,
        params,
      );
      return (data.items || []).map((item): GeocodingResult => {
        const center = { lat: item.position.lat, lng: item.position.lng };
        let bbox: Bounds;
        if (item.mapView) {
          bbox = [
            { lat: item.mapView.south, lng: item.mapView.west },
            { lat: item.mapView.north, lng: item.mapView.east },
          ];
        } else {
          // Using only position when not provided
          bbox = [
            { lat: item.position.lat, lng: item.position.lng },
            { lat: item.position.lat, lng: item.position.lng },
          ];
        }
        return {
          name: item.address.label,
          properties: item,
          bbox,
          center,
        };
      });
    },
  };
};

/**
 * Implementation of the [HERE Geocoder API](https://developer.here.com/documentation/geocoder/topics/introduction.html)
 */
export const HERE: GeocoderBuilder = (options: Partial<HereOptions>) => {
  const mergedOptions = {
    serviceUrl: 'https://geocoder.api.here.com/6.2/',
    app_id: '',
    app_code: '',
    apiKey: '',
    maxResults: 5,
    ...options,
  };

  if (mergedOptions.apiKey) {
    throw Error('apiKey is not supported, use app_id/app_code instead!');
  }

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params: Record<string, unknown> = {
      searchtext: query,
      gen: 9,
      app_id: mergedOptions.app_id,
      app_code: mergedOptions.app_code,
      jsonattributes: 1,
      maxresults: mergedOptions.maxResults,
    };

    const data = await getJSON<HereV1Response>(
      `${mergedOptions.serviceUrl}geocode.json`,
      params,
    );
    return (data.response.view?.[0]?.result || []).map(
      (result: HereV1Result): GeocodingResult => {
        const loc = result.location;
        const center = {
          lat: loc.displayPosition.latitude,
          lng: loc.displayPosition.longitude,
        };
        const bbox: Bounds = [
          {
            lat: loc.mapView.topLeft.latitude,
            lng: loc.mapView.topLeft.longitude,
          },
          {
            lat: loc.mapView.bottomRight.latitude,
            lng: loc.mapView.bottomRight.longitude,
          },
        ];
        return {
          name: loc.address.label,
          properties: loc,
          bbox,
          center,
        };
      },
    );
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      let prox = `${location.lat},${location.lng}`;
      if (mergedOptions.reverseGeocodeProxRadius) {
        prox += `,${mergedOptions.reverseGeocodeProxRadius}`;
      }

      const params: Record<string, unknown> = {
        prox,
        mode: 'retrieveAddresses',
        app_id: mergedOptions.app_id,
        app_code: mergedOptions.app_code,
        gen: 9,
        jsonattributes: 1,
        maxresults: mergedOptions.maxResults,
      };

      const data = await getJSON<HereV1Response>(
        `${mergedOptions.serviceUrl}reversegeocode.json`,
        params,
      );
      return (data.response.view?.[0]?.result || []).map(
        (result: HereV1Result): GeocodingResult => {
          const loc = result.location;
          const center = {
            lat: loc.displayPosition.latitude,
            lng: loc.displayPosition.longitude,
          };
          const bbox: Bounds = [
            {
              lat: loc.mapView.topLeft.latitude,
              lng: loc.mapView.topLeft.longitude,
            },
            {
              lat: loc.mapView.bottomRight.latitude,
              lng: loc.mapView.bottomRight.longitude,
            },
          ];
          return {
            name: loc.address.label,
            properties: loc,
            bbox,
            center,
          };
        },
      );
    },
  };
};

/**
 * @internal
 */
export interface HEREv2Response {
  items: Item[];
}

interface Item {
  title: string;
  id: string;
  ontologyId: string;
  resultType: string;
  address: Address;
  mapView?: MapView;
  position: Position;
  access: Position[];
  distance: number;
  categories: Category[];
  references: Reference[];
  foodTypes: Category[];
  contacts: Contact[];
  openingHours: OpeningHour[];
}

interface MapView {
  east: number;
  north: number;
  south: number;
  west: number;
}

interface Position {
  lat: number;
  lng: number;
}

interface Address {
  label: string;
  countryCode: string;
  countryName: string;
  stateCode: string;
  state: string;
  county: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  houseNumber: string;
}

interface Category {
  id: string;
  name: string;
  primary?: boolean;
}

interface Contact {
  phone: Email[];
  fax: Email[];
  www: Email[];
  email: Email[];
}

interface Email {
  value: string;
}

interface OpeningHour {
  text: string[];
  isOpen: boolean;
  structured: Structured[];
}

interface Structured {
  start: string;
  duration: string;
  recurrence: string;
}

interface Reference {
  supplier: Supplier;
  id: string;
}

interface Supplier {
  id: string;
}
