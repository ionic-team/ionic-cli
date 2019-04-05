import { CommandGroup, Footnote, OptionGroup } from '@ionic/cli-framework';
import { sleepForever } from '@ionic/utils-process';
import * as lodash from 'lodash';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../definitions';
import { input, strong } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { BROWSERS, COMMON_SERVE_COMMAND_OPTIONS, DEFAULT_LAB_PORT, serve } from '../lib/serve';

export class ServeCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    let groups: string[] = [];

    const options: CommandMetadataOption[] = [
      ...COMMON_SERVE_COMMAND_OPTIONS,
      {
        name: 'lab-host',
        summary: 'Use specific address for Ionic Lab server',
        default: 'localhost',
        groups: [OptionGroup.Advanced],
        spec: { value: 'host' },
      },
      {
        name: 'lab-port',
        summary: 'Use specific port for Ionic Lab server',
        default: DEFAULT_LAB_PORT.toString(),
        groups: [OptionGroup.Advanced],
        spec: { value: 'port' },
      },
      {
        name: 'open',
        summary: 'Do not open a browser window',
        type: Boolean,
        default: true,
        // TODO: Adding 'b' to aliases here has some weird behavior with minimist.
      },
      {
        name: 'local',
        summary: 'Disable external network usage',
        type: Boolean,
      },
      {
        name: 'browser',
        summary: `Specifies the browser to use (${BROWSERS.map(b => input(b)).join(', ')})`,
        aliases: ['w'],
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'browseroption',
        summary: `Specifies a path to open to (${input('/#/tab/dash')})`,
        aliases: ['o'],
        groups: [OptionGroup.Advanced],
        spec: { value: 'path' },
      },
      {
        name: 'lab',
        summary: 'Test your apps on multiple platform types in the browser',
        type: Boolean,
        aliases: ['l'],
      },
    ];

    const exampleCommands = ['', '--local', '--lab'];
    const footnotes: Footnote[] = [];

    let description = `
Easily spin up a development server which launches in your browser. It watches for changes in your source files and automatically reloads with the updated build.

By default, ${input('ionic serve')} boots up a development server on all network interfaces and prints the external address(es) on which your app is being served. It also broadcasts your app to the Ionic DevApp on your network. To disable the DevApp and bind to ${input('localhost')}, use ${input('--local')}.

Try the ${input('--lab')} option to see multiple platforms at once.`;

    const runner = this.project && await this.project.getServeRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      groups = libmetadata.groups || [];
      options.push(...libmetadata.options || []);
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

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const lastpath = lodash.last(runinfo.location.path);
    const alias = lastpath ? lastpath[0] : undefined;

    if (alias === 'lab') {
      options['lab'] = true;
    }

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

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic serve')} outside a project directory.`);
    }

    // TODO: use runner directly
    await serve({ flags: this.env.flags, config: this.env.config, log: this.env.log, prompt: this.env.prompt, shell: this.env.shell, project: this.project }, inputs, options);
    await sleepForever();
  }
}

export class LabCommand extends ServeCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const metadata = await super.getMetadata();
    const groups = [...metadata.groups || [], CommandGroup.Hidden];
    const exampleCommands = [...metadata.exampleCommands || []].filter(c => !c.includes('--lab'));

    return {
      ...metadata,
      summary: 'Start Ionic Lab for multi-platform dev/testing',
      description: `
Start an instance of ${strong('Ionic Lab')}, a tool for developing Ionic apps for multiple platforms at once side-by-side.

${input('ionic lab')} is just a convenient shortcut for ${input('ionic serve --lab')}.`,
      groups,
      exampleCommands,
    };
  }
}
