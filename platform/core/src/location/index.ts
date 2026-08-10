import { config } from '../config';
import {
  geocoder,
  type GeocodingResult,
  type GeocoderType,
} from '@openpeepshq/geocoder';
import { createCache } from 'cache-manager';

const cache = createCache({
  ttl: 60 * 60 * 24 * 7 * 1000,
});

const getNominatimResults = async (query: string): Promise<GeocodingResult[]> =>
  cache.wrap(query, async () => {
    const coreConfig = await config();
    const remoteGeocoder = geocoder(
      (coreConfig.services.location.type || 'nominatim') as GeocoderType,
      {
        apiKey: coreConfig.services.location.apiKey,
        serviceUrl: coreConfig.services.location.url,
      },
    );
    return remoteGeocoder.geocode(query).catch(() => []);
  });

export const getLocationSuggestions = async (
  query: string,
): Promise<GeocodingResult[]> => {
  query = query.trim();
  const latLngGeocoder = geocoder('latlng');
  const latLngResults = await latLngGeocoder.geocode(query);
  if (latLngResults.length > 0) {
    return latLngResults;
  }

  const openLocationCodeGeocoder = geocoder('open-location-code');
  const openLocationCodeResults = await openLocationCodeGeocoder.geocode(query);
  if (openLocationCodeResults.length > 0) {
    return openLocationCodeResults;
  }

  return getNominatimResults(query);
};
