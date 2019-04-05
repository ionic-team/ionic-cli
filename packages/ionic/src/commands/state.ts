import { CommandGroup } from '@ionic/cli-framework';
import { columnar, indent } from '@ionic/cli-framework/utils/format';

import { CommandMetadata } from '../definitions';
import { input, strong } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';

export class StateCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'state',
      type: 'global',
      summary: '',
      groups: [CommandGroup.Hidden],
    };
  }

  async run(): Promise<void> {
    const data = [
      [`${indent(4)}${input('ionic cordova platform save')}`, `save existing installed platforms to ${strong('config.xml')}`],
      [`${indent(4)}${input('ionic cordova plugin save')}`, `save existing installed plugins to ${strong('config.xml')}`],
      [`${indent(4)}${input('ionic cordova platform --help')}`, `view help page for managing Cordova platforms`],
      [`${indent(4)}${input('ionic cordova plugin --help')}`, `view help page for managing Cordova plugins`],
      [`${indent(4)}${input('ionic cordova prepare')}`, `install platforms and plugins listed in ${strong('config.xml')}`],
    ];

    throw new FatalException(
      `${input('ionic state')} has been removed.\n\n` +
      `We recommend using Cordova directly to manage Cordova plugins and platforms.\n` +
      `The following commands fulfill the old ${input('ionic state')} functionality:\n\n` +
      `${columnar(data, {})}\n\n` +
      `See ${strong('https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/')} for detailed information.\n`
    );
  }
}
