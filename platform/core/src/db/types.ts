import { Database } from 'arangojs';

export interface OpenpeepsDatabase {
  db: Database;
}

export interface UserFunctionDefinition {
  name: string;
  dbFunction: Function;
}

export interface ObjectFilter<O extends object> {
  (item: O): boolean;
}

export interface FilterAndTransformOptions<I extends object, O extends object = I> {
  filter?: (item: O) => boolean;
  transform?: (item: I) => Promise<O>;
  limit?: number;
  offset?: number;
}