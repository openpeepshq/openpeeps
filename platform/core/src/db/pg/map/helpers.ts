import type { MapData, PgFilter } from './queryTypes';

export const addFilter = <O extends object, F extends object>(
  mapData: MapData<O, F>,
  filter?: PgFilter<F>,
): MapData<O, F> =>
  filter
    ? {
        ...mapData,
        filters: [...(mapData.filters || []), filter],
      }
    : mapData;
