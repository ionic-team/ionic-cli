import {
  BowerJson,
  PackageJson,
} from './definitions';

export function isPackageJson(o: Object): o is PackageJson {
  const obj = <PackageJson>o;
  return obj && typeof obj.name === 'string';
}

export function isBowerJson(o: Object): o is BowerJson {
  const obj = <BowerJson>o;
  return obj && typeof obj.name === 'string';
}
