import { PackageJson } from 'type-fest';

export interface Plugin {
  key: string;
  namespace: string;
  name: string;
  info: PackageJson;
  path: string;
}
