import type { Limit } from '../db/pg/map/queryTypes';
import { OffsetInfiniteQueryParams } from '@openpeeps/common/types';

export const queryParamsToLimit = (query: OffsetInfiniteQueryParams): Limit =>
  query?.offset ? [query.offset, query?.limit ?? 15] : (query?.limit ?? 15);
