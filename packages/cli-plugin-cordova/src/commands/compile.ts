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

@CommandMetadata({
  name: 'compile',
  description: 'Compile native platform code'
})
export class CompileCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    const tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);

    const optionList: string[] = gatherArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await this.env.shell.run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
