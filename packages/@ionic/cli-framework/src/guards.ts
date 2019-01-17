import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, ICommand, INamespace, LinkFootnote, PackageJson } from './definitions';

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

export function isHydratedCommandMetadata<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(obj: any): obj is HydratedCommandMetadata<C, N, M, I, O> {
  return obj &&
    typeof obj.name === 'string' &&
    isCommand(obj.command) &&
    isNamespace(obj.namespace) &&
    Array.isArray(obj.path) &&
    Array.isArray(obj.aliases);
}

export function isPackageJson(obj: any): obj is PackageJson {
  return obj && typeof obj.name === 'string';
}

export function isLinkFootnote(obj: any): obj is LinkFootnote {
  return obj &&
    (typeof obj.id === 'number' || typeof obj.id === 'string') &&
    typeof obj.url === 'string';
}
