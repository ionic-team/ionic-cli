import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  IonicEnvironment,
  formatHelp,
  getFormattedHelpDetails,
  isCommand,
} from '@ionic/cli-utils';

import { ERROR_PLUGIN_NOT_INSTALLED, KNOWN_PLUGINS, ORG_PREFIX, PLUGIN_PREFIX, loadPlugin } from '../lib/plugins';

@CommandMetadata({
  name: 'help',
  unlisted: true,
  description: 'Provides help for a certain command',
  exampleCommands: ['start'],
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with'
    }
  ]
})
export class HelpCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    HelpCommand.showHelp(this.env, inputs);
  }

  static async showHelp(env: IonicEnvironment, inputs: string[]) {
    const inProject = env.project.directory ? true : false;

    // If there are no inputs then show global command details.
    if (inputs.length === 0) {
      return env.log.msg(getFormattedHelpDetails(env.namespace, inputs, inProject));
    }

    const [slicedInputs, cmdOrNamespace] = env.namespace.locate(inputs);

    if (!isCommand(cmdOrNamespace)) {
      let extra = '';

      if (env.project.directory) {
        if (KNOWN_PLUGINS.indexOf(slicedInputs[0]) !== -1) {
          try {
            await loadPlugin(env.project.directory, `${ORG_PREFIX}/${PLUGIN_PREFIX}${slicedInputs[0]}`);
          } catch (e) {
            if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
              throw e;
            }
          }
        }
      } else {
        extra = '\nYou may need to be in an Ionic project directory.';
      }

      if (slicedInputs.length > 0) {
        env.log.error(`Unable to find command: ${chalk.bold(inputs.join(' '))}.${extra}`);
      }
    }

    env.log.msg(formatHelp(cmdOrNamespace, inputs, inProject));
  }

}
