import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';
import { getJSON } from '../util';

/**
 * Implementation of the [ArcGIS geocoder](https://developers.arcgis.com/features/geocoding/)
 */
export const ArcGis: GeocoderBuilder = (options: Partial<GeocoderOptions>) => {
  const mergedOptions = {
    serviceUrl:
      'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer',
    apiKey: '',
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const params = {
      token: mergedOptions.apiKey,
      SingleLine: query,
      outFields: 'Addr_Type',
      forStorage: false,
      maxLocations: 10,
      f: 'json',
    };

    const data = await getJSON<ArcGisResponse>(
      mergedOptions.serviceUrl + '/findAddressCandidates',
      params,
    );
    return data.candidates.map((loc): GeocodingResult => {
      const center = { lat: loc.location.y, lng: loc.location.x };
      const bbox: Bounds = [
        { lat: loc.extent.ymax, lng: loc.extent.xmax },
        { lat: loc.extent.ymin, lng: loc.extent.xmin },
      ];
      return {
        name: loc.address,
        bbox,
        center,
      };
    });
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const params = {
        location: location.lng + ',' + location.lat,
        distance: 100,
        f: 'json',
      };
      const data = await getJSON<any>(
        mergedOptions.serviceUrl + '/reverseGeocode',
        params,
      );
      if (!data || data.error) {
        return [];
      }
      const center = { lat: data.location.y, lng: data.location.x };
      const bbox: Bounds = [
        { lat: data.location.y, lng: data.location.x },
        { lat: data.location.y, lng: data.location.x },
      ];
      return [
        {
          name: data.address.Match_addr,
          center,
          bbox,
        },
      ];
    },
  };
};

/**
 * @internal
 */
export interface ArcGisResponse {
  spatialReference: {
    wkid: number;
    latestWkid: number;
  };
  candidates: Candidate[];
}

interface Candidate {
  address: string;
  location: {
    x: number;
    y: number;
  };
  score: number;
  attributes: {
    Addr_Type: string;
  };
  extent: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}
