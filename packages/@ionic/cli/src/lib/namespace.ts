import { BaseCommandMap, BaseNamespace, BaseNamespaceMap } from '@ionic/cli-framework';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, INamespace, IProject, IonicEnvironment } from '../definitions';

export class CommandMap extends BaseCommandMap<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export class NamespaceMap extends BaseNamespaceMap<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

export abstract class Namespace extends BaseNamespace<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> implements INamespace {
  constructor(public parent: INamespace | undefined) {
    super(parent);
  }

  get env(): IonicEnvironment {
    return this.root.env;
  }

  get project(): IProject | undefined {
    return this.root.project;
  }
}
