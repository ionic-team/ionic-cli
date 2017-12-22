import {
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  ICommand,
  INamespace,
} from '../definitions';

import { BaseCommandMap, BaseNamespace, BaseNamespaceMap } from '@ionic/cli-framework';

export class CommandMap extends BaseCommandMap<ICommand, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export class NamespaceMap extends BaseNamespaceMap<ICommand, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

export abstract class Namespace extends BaseNamespace<ICommand, CommandMetadata, CommandMetadataInput, CommandMetadataOption> implements INamespace {}
