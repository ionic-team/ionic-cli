import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell,
  TaskChain
} from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetSrcContent } from '../lib/utils/configXmlUtils';

/**
 * Metadata about the prepare command
 */
@CommandMetadata({
  name: 'prepare',
  description: 'prepare'
})
export class PrepareCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    var tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await new Shell().run('cordova', optionList);
  }
}
