import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ERROR_SHELL_COMMAND_NOT_FOUND,
  TaskChain,
} from '@ionic/cli-utils';
import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';

@CommandMetadata({
  name: 'compile',
  type: 'project',
  description: 'Compile native platform code'
})
export class CompileCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    const tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);

    const optionList: string[] = gatherArgumentsForCordova(this.metadata, inputs, options);
    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);

    try {
      await this.env.shell.run('cordova', optionList, {
        showExecution: this.env.log.level === 'debug',
        fatal: false,
      });
    } catch (e) {
      if (e === ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw this.exit(`The Cordova CLI was not found on your PATH. Please install Cordova globally:\n\n` +
                        `${chalk.green('npm install -g cordova')}\n`);
      }

      throw e;
    }

    tasks.end();
  }
}
