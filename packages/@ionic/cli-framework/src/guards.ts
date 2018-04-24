import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, INamespace, PackageJson } from './definitions';

export function isNamespace<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(obj: any): obj is N {
  return obj &&
    typeof obj.getMetadata === 'function' &&
    typeof obj.getNamespaces === 'function' &&
    typeof obj.getCommands === 'function';
}

export function isCommand<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(obj: any): obj is C {
  return obj && isNamespace(obj.namespace) &&
    typeof obj.getMetadata === 'function' &&
    typeof obj.run === 'function' &&
    typeof obj.validate === 'function';
}

export function isPackageJson(obj: any): obj is PackageJson {
  return obj && typeof obj.name === 'string';
}
