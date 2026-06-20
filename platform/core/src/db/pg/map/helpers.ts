import type { MapData, OMFilter } from './queryTypes';

export const addFilter = <O extends object, F>(
  mapData: MapData<O, F>,
  filter?: OMFilter<F>,
): MapData<O, F> =>
  filter
    ? {
        ...mapData,
        filters: [...(mapData.filters || []), filter],
      }
    : mapData;
