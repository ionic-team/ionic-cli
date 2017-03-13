import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain
} from '@ionic/cli-utils';
import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';

/**
 * Metadata about the prepare command
 */
@CommandMetadata({
  name: 'prepare',
  description: 'Transforms metadata to manifests and copies required assets.'
})
export class PrepareCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    var tasks = new TaskChain();

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    const optionList: string[] = gatherArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    try {
      await this.env.shell.run('cordova', optionList, {
        showExecution: (this.env.log.level === 'debug')
      });
    } catch (e) {
      throw e;
    }

    tasks.end();
  }
}
