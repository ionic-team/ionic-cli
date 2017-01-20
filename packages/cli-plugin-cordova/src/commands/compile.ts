import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell
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

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    /**
     *
     */
    const optionList: string[] = filterArgumentsForCordova('compile', inputs, options);
    await new Shell().run('cordova', optionList);
  }
}
