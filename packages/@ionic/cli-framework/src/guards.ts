import {
  BowerJson,
  PackageJson,
  ValidationError,
} from './definitions';

export function isPackageJson(o: Object): o is PackageJson {
  const obj = <PackageJson>o;
  return obj && typeof obj.name === 'string';
}

export function isBowerJson(o: Object): o is BowerJson {
  const obj = <BowerJson>o;
  return obj && typeof obj.name === 'string';
}

export function isValidationErrorArray(e: Object[]): e is ValidationError[] {
  const err = <ValidationError[]>e;
  return err && err[0]
    && typeof err[0].message === 'string'
    && typeof err[0].inputName === 'string';
}
