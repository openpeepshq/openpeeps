import {
  Bounds,
  GeocoderBuilder,
  GeocoderOptions,
  GeocodingResult,
  LatLng,
} from '../types';

export interface LatLngOptions extends GeocoderOptions {
  /**
   * The next geocoder to use for non-supported queries
   */
  next?: GeocoderBuilder;
  /**
   * The size in meters used for creating bounds around the point
   */
  sizeInMeters: number;
}

/**
 * Parses basic latitude/longitude strings such as `'50.06773 14.37742'`, `'N50.06773 W14.37742'`, `'S 50° 04.064 E 014° 22.645'`, or `'S 50° 4′ 03.828″, W 14° 22′ 38.712″'`
 * @param query the latitude/longitude string to parse
 * @returns the parsed latitude/longitude
 */
export function parseLatLng(query: string): LatLng | undefined {
  let match;
  // regex from https://github.com/openstreetmap/openstreetmap-website/blob/master/app/controllers/geocoder_controller.rb
  if (
    (match = query.match(
      /^([NS])\s*(\d{1,3}(?:\.\d*)?)\W*([EW])\s*(\d{1,3}(?:\.\d*)?)$/,
    ))
  ) {
    // [NSEW] decimal degrees
    return {
      lat: (/N/i.test(match[1]) ? 1 : -1) * +match[2],
      lng: (/E/i.test(match[3]) ? 1 : -1) * +match[4],
    };
  } else if (
    (match = query.match(
      /^(\d{1,3}(?:\.\d*)?)\s*([NS])\W*(\d{1,3}(?:\.\d*)?)\s*([EW])$/,
    ))
  ) {
    // decimal degrees [NSEW]
    return {
      lat: (/N/i.test(match[2]) ? 1 : -1) * +match[1],
      lng: (/E/i.test(match[4]) ? 1 : -1) * +match[3],
    };
  } else if (
    (match = query.match(
      /^([NS])\s*(\d{1,3})°?\s*(\d{1,3}(?:\.\d*)?)?['′]?\W*([EW])\s*(\d{1,3})°?\s*(\d{1,3}(?:\.\d*)?)?['′]?$/,
    ))
  ) {
    // [NSEW] degrees, decimal minutes
    return {
      lat: (/N/i.test(match[1]) ? 1 : -1) * (+match[2] + +match[3] / 60),
      lng: (/E/i.test(match[4]) ? 1 : -1) * (+match[5] + +match[6] / 60),
    };
  } else if (
    (match = query.match(
      /^(\d{1,3})°?\s*(\d{1,3}(?:\.\d*)?)?['′]?\s*([NS])\W*(\d{1,3})°?\s*(\d{1,3}(?:\.\d*)?)?['′]?\s*([EW])$/,
    ))
  ) {
    // degrees, decimal minutes [NSEW]
    return {
      lat: (/N/i.test(match[3]) ? 1 : -1) * (+match[1] + +match[2] / 60),
      lng: (/E/i.test(match[6]) ? 1 : -1) * (+match[4] + +match[5] / 60),
    };
  } else if (
    (match = query.match(
      /^([NS])\s*(\d{1,3})°?\s*(\d{1,2})['′]?\s*(\d{1,3}(?:\.\d*)?)?["″]?\W*([EW])\s*(\d{1,3})°?\s*(\d{1,2})['′]?\s*(\d{1,3}(?:\.\d*)?)?["″]?$/,
    ))
  ) {
    // [NSEW] degrees, minutes, decimal seconds
    return {
      lat:
        (/N/i.test(match[1]) ? 1 : -1) *
        (+match[2] + +match[3] / 60 + +match[4] / 3600),
      lng:
        (/E/i.test(match[5]) ? 1 : -1) *
        (+match[6] + +match[7] / 60 + +match[8] / 3600),
    };
  } else if (
    (match = query.match(
      /^(\d{1,3})°?\s*(\d{1,2})['′]?\s*(\d{1,3}(?:\.\d*)?)?["″]\s*([NS])\W*(\d{1,3})°?\s*(\d{1,2})['′]?\s*(\d{1,3}(?:\.\d*)?)?["″]?\s*([EW])$/,
    ))
  ) {
    // degrees, minutes, decimal seconds [NSEW]
    return {
      lat:
        (/N/i.test(match[4]) ? 1 : -1) *
        (+match[1] + +match[2] / 60 + +match[3] / 3600),
      lng:
        (/E/i.test(match[8]) ? 1 : -1) *
        (+match[5] + +match[6] / 60 + +match[7] / 3600),
    };
  } else if (
    (match = query.match(
      /^\s*([+-]?\d+(?:\.\d*)?)\s*[\s,]\s*([+-]?\d+(?:\.\d*)?)\s*$/,
    ))
  ) {
    return { lat: +match[1], lng: +match[2] };
  }
}

/**
 * Creates a bounding box around a point with the specified size in meters
 */
function createBounds(center: LatLng, sizeInMeters: number): Bounds {
  // Approximate conversion from meters to degrees (at the equator)
  const sizeInDegrees = sizeInMeters / 111320;
  return [
    { lat: center.lat - sizeInDegrees, lng: center.lng - sizeInDegrees },
    { lat: center.lat + sizeInDegrees, lng: center.lng + sizeInDegrees },
  ];
}

/**
 * Implementation of a geocoder that parses latitude/longitude strings
 */
export const LatLngGeocoder: GeocoderBuilder = (
  options: Partial<LatLngOptions>,
) => {
  const mergedOptions = {
    sizeInMeters: 10000,
    ...options,
  };

  const geocode = async (query: string): Promise<GeocodingResult[]> => {
    const center = parseLatLng(query);
    if (center) {
      return [
        {
          name: query,
          center,
          bbox: createBounds(center, mergedOptions.sizeInMeters),
        },
      ];
    }

    if (mergedOptions.next) {
      const nextGeocoder = mergedOptions.next({
        serviceUrl: mergedOptions.serviceUrl || '',
      });
      return nextGeocoder.geocode(query);
    }

    return [];
  };

  return {
    geocode,
    suggest: geocode,
    reverse: async (location: LatLng): Promise<GeocodingResult[]> => {
      const query = `${location.lat},${location.lng}`;
      return [
        {
          name: query,
          center: location,
          bbox: createBounds(location, mergedOptions.sizeInMeters),
        },
      ];
    },
  };
};
