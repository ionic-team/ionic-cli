import {
  BowerJson,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  ICommand,
  ICommandMapKey,
  INamespace,
  PackageJson,
} from './definitions';

export function isNamespace<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption>(obj: any): obj is INamespace<T, U, V, W> {
  return obj &&
    typeof obj.getMetadata === 'function' &&
    typeof obj.getNamespaces === 'function' &&
    typeof obj.getCommands === 'function';
}

export function isCommand<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption>(obj: any): obj is T {
  return obj && isNamespace(obj.namespace) &&
    typeof obj.getMetadata === 'function' &&
    typeof obj.run === 'function' &&
    typeof obj.validate === 'function';
}

export function isCommandMapKey(v: any): v is ICommandMapKey {
  return typeof v === 'string' || typeof v === 'symbol';
}

export function isPackageJson(obj: any): obj is PackageJson {
  return obj && typeof obj.name === 'string';
}

export function isBowerJson(obj: any): obj is BowerJson {
  return obj && typeof obj.name === 'string';
}
