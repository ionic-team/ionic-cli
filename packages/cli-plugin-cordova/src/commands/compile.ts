import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata
} from '@ionic/cli';

/**
 * Metadata about the compile command
 */
@CommandMetadata({
  name: 'compile',
  description: 'compile',
  isProjectTask: true
})
export class CompileCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.log.msg('compile');
  }
}
