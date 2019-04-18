import { contains, validate, validators } from '@ionic/cli-framework';
import * as lodash from 'lodash';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

import { CordovaCommand } from './base';

export class PlatformCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'platform',
      type: 'project',
      summary: 'Manage Cordova platform targets',
      description: `
Like running ${input('cordova platform')} directly, but adds default Ionic icons and splash screen resources (during ${input('add')}) and provides friendly checks.
      `,
      exampleCommands: ['', 'add ios', 'add android', 'rm ios'],
      inputs: [
        {
          name: 'action',
          summary: `${input('add')}, ${input('remove')}, or ${input('update')} a platform; ${input('ls')}, ${input('check')}, or ${input('save')} all project platforms`,
        },
        {
          name: 'platform',
          summary: `The platform that you would like to add (${['android', 'ios'].map(v => input(v)).join(', ')})`,
        },
      ],
      options: [
        {
          name: 'resources',
          summary: `Do not pregenerate icons and splash screen resources (corresponds to ${input('add')})`,
          type: Boolean,
          default: true,
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    if (options['r'] || options['noresources']) {
      options['resources'] = false;
    }

    inputs[0] = !inputs[0] ? 'ls' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'list') ? 'ls' : inputs[0];

    validate(inputs[0], 'action', [contains(['add', 'remove', 'update', 'ls', 'check', 'save'], {})]);

    // If the action is list, check, or save, then just end here.
    if (['ls', 'check', 'save'].includes(inputs[0])) {
      await this.runCordova(['platform', inputs[0]], {});
      throw new FatalException('', 0);
    }

    if (!inputs[1]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to ${inputs[0]} (${['android', 'ios'].map(v => input(v)).join(', ')}):`,
      });

      inputs[1] = platform.trim();
    }

    validate(inputs[1], 'platform', [validators.required]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const { getPlatforms } = await import('../../lib/integrations/cordova/project');
    const { filterArgumentsForCordova } = await import('../../lib/integrations/cordova/utils');

    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova platform')} outside a project directory.`);
    }

    const [ action, platformName ] = inputs;

    const platforms = await getPlatforms(this.integration.root);

    if (action === 'add' && platforms.includes(platformName)) {
      this.env.log.msg(`Platform ${platformName} already exists.`);
      return;
    }

    const metadata = await this.getMetadata();
    const cordovaArgs = filterArgumentsForCordova(metadata, options);

    if (
      (action === 'add' || action === 'remove') &&
      (options['save'] !== false && !options['nosave']) &&
      lodash.intersection(options['--'] || [], ['--save', '--nosave', '--no-save']).length === 0
    ) {
      cordovaArgs.push('--save');
    }

    await this.runCordova(cordovaArgs, {});

    const isLoggedIn = this.env.session.isLoggedIn();

    if (isLoggedIn && action === 'add' && options['resources'] && ['ios', 'android'].includes(platformName)) {
      await runCommand(runinfo, ['cordova', 'resources', platformName, '--force']);
    }
  }
}
