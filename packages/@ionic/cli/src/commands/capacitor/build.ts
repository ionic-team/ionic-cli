import { BaseError, Footnote, MetadataGroup, validators } from '@ionic/cli-framework';

import { CapacitorBuildHookName, CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException, RunnerException } from '../../lib/errors';
import { Hook, HookDeps } from '../../lib/hooks';
import { getNativeIDEForPlatform } from '../../lib/integrations/capacitor/utils';

import { CapacitorCommand } from './base';

export class BuildCommand extends CapacitorCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const groups: string[] = [MetadataGroup.BETA];
    const exampleCommands = [
      '',
      'android',
      'ios',
    ].sort();

    const options: CommandMetadataOption[] = [
      // Build Options
      {
        name: 'build',
        summary: 'Do not invoke Ionic build',
        type: Boolean,
        default: true,
      },
      {
        name: 'open',
        summary: 'Do not invoke Capacitor open',
        type: Boolean,
        default: true,
      },
    ];

    const footnotes: Footnote[] = [
      {
        id: 'capacitor-native-config-docs',
        url: 'https://capacitor.ionicframework.com/docs/basics/configuring-your-app',
        shortUrl: 'https://ion.link/capacitor-native-config-docs',
      },
      {
        id: 'capacitor-ios-config-docs',
        url: 'https://capacitor.ionicframework.com/docs/ios/configuration',
        shortUrl: 'https://ion.link/capacitor-ios-config-docs',
      },
      {
        id: 'capacitor-android-config-docs',
        url: 'https://capacitor.ionicframework.com/docs/android/configuration',
        shortUrl: 'https://ion.link/capacitor-android-config-docs',
      },
    ];

    const buildRunner = this.project && await this.project.getBuildRunner();

    if (buildRunner) {
      const libmetadata = await buildRunner.getCommandMetadata();
      groups.push(...libmetadata.groups || []);
      options.push(...libmetadata.options || []);
      footnotes.push(...libmetadata.footnotes || []);
    }

    return {
      name: 'build',
      type: 'project',
      summary: 'Build an Ionic project for a given platform',
      description: `
${input('ionic capacitor build')} will do the following:
- Perform ${input('ionic build')}
- Copy web assets into the specified native platform
- Open the IDE for your native project (Xcode for iOS, Android Studio for Android)

Once the web assets and configuration are copied into your native project, you can build your app using the native IDE. Unfortunately, programmatically building the native project is not yet supported.

To configure your native project, see the common configuration docs[^capacitor-native-config-docs] as well as low-level configuration for iOS[^capacitor-ios-config-docs] and Android[^capacitor-android-config-docs].
      `,
      footnotes,
      exampleCommands,
      inputs: [
        {
          name: 'platform',
          summary: `The platform to build for (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
          validators: [validators.required],
        },
      ],
      options,
      groups,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (!inputs[0]) {
      const platform = await this.env.prompt({
        type: 'list',
        name: 'platform',
        message: 'What platform would you like to build for?',
        choices: ['android', 'ios'],
      });

      inputs[0] = platform.trim();
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic capacitor build')} outside a project directory.`);
    }

    const [ platform ] = inputs;

    try {
      await this.runBuild(inputs, options);
    } catch (e) {
      if (e instanceof RunnerException) {
        throw new FatalException(e.message);
      }

      throw e;
    }

    await this.runCapacitor(['sync', platform]);

    const hookDeps: HookDeps = {
      config: this.env.config,
      project: this.project,
      shell: this.env.shell,
    };

    await this.runCapacitorBuildHook('capacitor:build:before', inputs, options, hookDeps);

    if (options['open']) {
      this.env.log.nl();
      this.env.log.info(this.getContinueMessage(platform));
      this.env.log.nl();

      await this.runCapacitor(['open', platform]);
    }
  }

  protected getContinueMessage(platform: string): string {
    if (platform === 'electron') {
      return 'Ready to be used in Electron!';
    }

    return (
      'Ready for use in your Native IDE!\n' +
      `To continue, build your project using ${getNativeIDEForPlatform(platform)}!`
    );
  }

  private async runCapacitorBuildHook(name: CapacitorBuildHookName, inputs: CommandLineInputs, options: CommandLineOptions, e: HookDeps): Promise<void> {
    const hook = new CapacitorBuildHook(name, e);
    const buildRunner = await e.project.requireBuildRunner();

    try {
      await hook.run({
        name: hook.name,
        build: buildRunner.createOptionsFromCommandLine(inputs, options),
        capacitor: this.createOptionsFromCommandLine(inputs, options),
      });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }
}

class CapacitorBuildHook extends Hook {
  readonly name: CapacitorBuildHookName;

  constructor(name: CapacitorBuildHookName, e: HookDeps) {
    super(e);

    this.name = name;
  }
}
