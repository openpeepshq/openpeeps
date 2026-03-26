import { PlusCodes } from 'olc-plus-codes';
import {
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';

export interface OpenLocationCodeOptions extends GeocoderOptions {
  codeLength?: number;
  debug?: boolean;
}

export interface CodeArea {
  latitudeLo: number;
  longitudeLo: number;
  latitudeHi: number;
  longitudeHi: number;
  latitudeCenter: number;
  longitudeCenter: number;
  codeLength: number;
}

/**
 * Implementation of the [Plus codes](https://plus.codes/) (formerly OpenLocationCode) (requires [open-location-code](https://www.npmjs.com/package/open-location-code))
 */
export const OpenLocationCode: GeocoderBuilder = (
  options: Partial<OpenLocationCodeOptions>,
) => {
  const mergedOptions = {
    codeLength: 10,
    ...options,
  };


  const api = new PlusCodes();

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    try {
      const decoded = api.decode(query);
      return [
        {
          name: query,
          center: { lat: decoded.latitudeCenter, lng: decoded.longitudeCenter },
          bbox: [
            { lat: decoded.latitudeLo, lng: decoded.longitudeLo },
            { lat: decoded.latitudeHi, lng: decoded.longitudeHi },
          ],
        },
      ];
    } catch (e) {
      if (mergedOptions.debug) {
        console.warn(e); // eslint-disable-line no-console
      }
      return [];
    }
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      try {
        const code = api.encode(
          location.lat,
          location.lng,
          mergedOptions.codeLength,
        );
        return [
          {
            name: code,
            center: location,
            bbox: [location, location],
          },
        ];
      } catch (e) {
        if (mergedOptions.debug) {
          console.warn(e); // eslint-disable-line no-console
        }
        return [];
      }
    },
  };
};
