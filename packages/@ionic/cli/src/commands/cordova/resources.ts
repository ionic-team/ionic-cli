import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { ancillary, input, strong } from '../../lib/color';
import { SUPPORTED_PLATFORMS, createCordovaResArgs, runCordovaRes } from '../../lib/cordova-res';
import { FatalException } from '../../lib/errors';

import { CordovaCommand } from './base';

export class ResourcesCommand extends CordovaCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'resources',
      type: 'project',
      summary: 'Automatically create icon and splash screen resources',
      description: `
Generate perfectly sized icons and splash screens from PNG source images for your Cordova platforms with this command.

The source image for icons should ideally be at least ${strong('1024×1024px')} and located at ${strong('resources/icon.png')}. The source image for splash screens should ideally be at least ${strong('2732×2732px')} and located at ${strong('resources/splash.png')}. If you used ${input('ionic start')}, there should already be default Ionic resources in the ${strong('resources/')} directory, which you can overwrite.

You can also generate platform-specific icons and splash screens by placing them in the respective ${strong('resources/<platform>/')} directory. For example, to generate an icon for Android, place your image at ${strong('resources/android/icon.png')}.

For best results, the splash screen's artwork should roughly fit within a square (${strong('1200×1200px')}) at the center of the image. You can use ${strong('https://code.ionicframework.com/resources/splash.psd')} as a template for your splash screen.

${input('ionic cordova resources')} will automatically update your ${strong('config.xml')} to reflect the changes in the generated images, which Cordova then configures.

This command uses the ${input('cordova-res')} utility[^cordova-res-repo] to generate resources locally.

Cordova reference documentation:
- Icons: ${strong('https://cordova.apache.org/docs/en/latest/config_ref/images.html')}
- Splash Screens: ${strong('https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-splashscreen/')}
      `,
      footnotes: [
        {
          id: 'cordova-res-repo',
          url: 'https://github.com/ionic-team/cordova-res',
        },
      ],
      exampleCommands: ['', ...SUPPORTED_PLATFORMS],
      inputs: [
        {
          name: 'platform',
          summary: `The platform for which you would like to generate resources (${SUPPORTED_PLATFORMS.map(v => input(v)).join(', ')})`,
        },
      ],
      options: [
        {
          name: 'icon',
          summary: 'Generate icon resources',
          type: Boolean,
          aliases: ['i'],
        },
        {
          name: 'splash',
          summary: 'Generate splash screen resources',
          type: Boolean,
          aliases: ['s'],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova resources')} outside a project directory.`);
    }

    if (options['cordova-res'] === false) {
      this.env.log.warn(
        `The ${input('--no-cordova-res')} option has been removed.\n` +
        `The Ionic image generation server has been shut down and the online resource generation flow no longer exists. Please migrate to ${strong('cordova-res')}${ancillary('[1]')}, the resource generation tool by Ionic that runs on your computer.\n\n` +
        `${ancillary('[1]')}: ${strong('https://github.com/ionic-team/cordova-res')}\n`
      );
    }

    const platform = inputs[0] ? String(inputs[0]) : undefined;

    await runCordovaRes(this.env, createCordovaResArgs({ platform }, options), { cwd: this.integration.root });
  }
}
