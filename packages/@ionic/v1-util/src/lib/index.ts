import { CommandData, CommandInput, CommandOption } from '@ionic/cli-framework';

import {
  Command as BaseCommand,
  CommandMap as BaseCommandMap,
  RootNamespace as BaseRootNamespace,
} from '@ionic/cli-framework/lib';

export abstract class Command extends BaseCommand<CommandData> {}
export abstract class Namespace extends BaseRootNamespace<Command, CommandData, CommandInput, CommandOption> {}
export class CommandMap extends BaseCommandMap<Command, CommandData, CommandInput, CommandOption> {}
