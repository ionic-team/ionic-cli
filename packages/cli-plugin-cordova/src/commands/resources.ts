import { CommandLineInputs, CommandLineOptions, Command, CommandMetadata } from '@ionic/cli-utils';

const RESOURCES_SUMMARY = `
Automatically create icon and splash screen resources
Put your images in the ./resources directory, named splash or icon.
Accepted file types are .png, .ai, and .psd.
Icons should be 192x192 px without rounded corners.
Splashscreens should be 2208x2208 px, with the image centered in the middle.
`;

const Settings = {
  apiUrl: 'http://res.ionic.io',
  apiUploadPath: '/api/v1/upload',
  apiTransformPath: '/api/v1/transform',
  resourceDir: 'resources',
  iconDir: 'icon',
  splashDir: 'splash',
  iconSourceFile: 'icon',
  splashSourceFile: 'splash',
  sourceExtensions: ['psd', 'ai', 'png'],
  supportedPlatforms: ['android', 'ios', 'wp8'],
  configFile: 'config.xml',
  generateThrottle: 4,
  defaultMaxIconSize: 96,
  cacheImages: false
};

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
  ]
})
export class ResourcesCommand extends Command {
  public async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    this.env.project.directory;

    this.env.log.msg(`resources`);
  }
}
