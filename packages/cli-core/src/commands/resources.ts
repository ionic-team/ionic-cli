import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';

const RESOURCES_SUMMARY = `
Automatically create icon and splash screen resources
Put your images in the ./resources directory, named splash or icon.
Accepted file types are .png, .ai, and .psd.
Icons should be 192x192 px without rounded corners.
Splashscreens should be 2208x2208 px, with the image centered in the middle.
`;

@CommandMetadata({
  name: 'resources',
  description: RESOURCES_SUMMARY,
  options: [
    {
      name: 'icon',
      description: 'Generate icon resources',
      type: Boolean,
      aliases: ['i']
    },
    {
      name: 'splash',
      description: 'Generate splash screen resources',
      type: Boolean,
      aliases: ['s']
    }
  ],
  isProjectTask: true
})
export class ResourcesCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    this.env.log.msg(`resources`);
  }
}
