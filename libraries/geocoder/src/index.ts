import { Geocoder, GeocoderOptions, GeocoderType } from './types';
import * as geocoders from './geocoders';

export * from './types';

export const geocoder = (
    type: GeocoderType,
    options: GeocoderOptions = {},
): Geocoder => {
    switch (type) {
        case 'arcgis':
            return geocoders.ArcGis(options);
        case 'azure':
            return geocoders.AzureMaps(options);
        case 'bing':
            return geocoders.Bing(options);
        case 'google':
            return geocoders.Google(options);
        case 'here':
            return geocoders.HERE(options);
        case 'latlng':
            return geocoders.LatLngGeocoder(options);
        case 'mapbox':
            return geocoders.Mapbox(options);
        case 'mapquest':
            return geocoders.MapQuest(options);
        case 'neutrino':
            return geocoders.Neutrino(options);
        case 'nominatim':
            return geocoders.Nominatim(options);
        case 'open-location-code':
            return geocoders.OpenLocationCode(options);
        case 'opencage':
            return geocoders.OpenCage(options);
        case 'photon':
            return geocoders.Photon(options);
        case 'pelias':
            return geocoders.Pelias(options);
        case 'what3words':
            return geocoders.What3Words(options);
        default:
            throw new Error(`Unsupported geocoder type: ${type}`);
    }
};
