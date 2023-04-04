import { Footnote, MetadataGroup } from '@ionic/cli-framework';
import { sleepForever } from '@ionic/utils-process';
import * as lodash from 'lodash';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../definitions';
import { input } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException, RunnerException } from '../lib/errors';
import { BROWSERS, COMMON_SERVE_COMMAND_OPTIONS } from '../lib/serve';

export class ServeCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const groups: string[] = [];

    let options: CommandMetadataOption[] = [
      ...COMMON_SERVE_COMMAND_OPTIONS,
      {
        name: 'open',
        summary: 'Do not open a browser window',
        type: Boolean,
        default: true,
        // TODO: Adding 'b' to aliases here has some weird behavior with minimist.
      },
      {
        name: 'browser',
        summary: `Specifies the browser to use (${BROWSERS.map(b => input(b)).join(', ')})`,
        aliases: ['w'],
        groups: [MetadataGroup.ADVANCED],
      },
      {
        name: 'browseroption',
        summary: `Specifies a path to open to (${input('/#/tab/dash')})`,
        aliases: ['o'],
        groups: [MetadataGroup.ADVANCED],
        spec: { value: 'path' },
      },
    ];

    const exampleCommands = ['', '--external'];
    const footnotes: Footnote[] = [];

    let description = `
Easily spin up a development server which launches in your browser. It watches for changes in your source files and automatically reloads with the updated build.

By default, ${input('ionic serve')} boots up a development server on ${input('localhost')}. To serve to your LAN, specify the ${input('--external')} option, which will use all network interfaces and print the external address(es) on which your app is being served.`;

    const runner = this.project && await this.project.getServeRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      groups.push(...libmetadata.groups || []);
      options = lodash.uniqWith([...libmetadata.options || [], ...options], (optionA, optionB) => optionA.name === optionB.name);
      description += `\n\n${(libmetadata.description || '').trim()}`;
      footnotes.push(...libmetadata.footnotes || []);
      exampleCommands.push(...libmetadata.exampleCommands || []);
    }

    return {
      name: 'serve',
      type: 'project',
      summary: 'Start a local dev server for app dev/testing',
      description,
      footnotes,
      groups,
      exampleCommands,
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, { location }: CommandInstanceInfo): Promise<void> {
    if (options['nolivereload']) {
      this.env.log.warn(`The ${input('--nolivereload')} option has been deprecated. Please use ${input('--no-livereload')}.`);
      options['livereload'] = false;
    }

    if (options['nobrowser']) {
      this.env.log.warn(`The ${input('--nobrowser')} option has been deprecated. Please use ${input('--no-open')}.`);
      options['open'] = false;
    }

    if (options['b']) {
      options['open'] = false;
    }

    if (options['noproxy']) {
      this.env.log.warn(`The ${input('--noproxy')} option has been deprecated. Please use ${input('--no-proxy')}.`);
      options['proxy'] = false;
    }

    if (options['x']) {
      options['proxy'] = false;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic serve')} outside a project directory.`);
    }

    try {
      const runner = await this.project.requireServeRunner();
      const runnerOpts = runner.createOptionsFromCommandLine(inputs, options);

      await runner.run(runnerOpts);
    } catch (e: any) {
      if (e instanceof RunnerException) {
        throw new FatalException(e.message);
      }

      throw e;
    }

    await sleepForever();
  }
}
