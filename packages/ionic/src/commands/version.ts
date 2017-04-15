import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  readCliPackageJsonFile,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'version',
  unlisted: true,
  description: 'Returns the current CLI version',
})
export class VersionCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const cliPackageJson = await readCliPackageJsonFile();
    this.env.log.msg(`${cliPackageJson.version}`);
  }
}
