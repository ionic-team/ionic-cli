import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell
} from '@ionic/cli-utils';
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
    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    const optionList: string[] = filterArgumentsForCordova('prepare', inputs, options);
    await new Shell().run('cordova', optionList);
  }
}
