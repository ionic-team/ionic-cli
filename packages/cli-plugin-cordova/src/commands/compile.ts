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
 * Metadata about the compile command
 */
@CommandMetadata({
  name: 'compile',
  description: 'compile'
})
export class CompileCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    var tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    /**
     *
     */
    const optionList: string[] = filterArgumentsForCordova('compile', inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await new Shell().run('cordova', optionList);
  }
}
