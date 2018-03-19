import chalk from 'chalk';
import * as lodash from 'lodash';

import {
  CommandGroup,
  CommandInstanceInfo,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataOption,
  CommandPreRun,
  OptionGroup,
  ServeOptions,
} from '@ionic/cli-utils';

import { Command } from '@ionic/cli-utils/lib/command';
import { BROWSERS, COMMON_SERVE_COMMAND_OPTIONS, DEFAULT_LAB_PORT, ServeRunner } from '@ionic/cli-utils/lib/serve';
import { RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';

export class ServeCommand extends Command implements CommandPreRun {
  protected runner?: ServeRunner<ServeOptions>;

  async getRunner() {
    if (!this.runner) {
      this.runner = await ServeRunner.createFromProjectType(this.env, this.env.project.type);
    }

    return this.runner;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [
      ...COMMON_SERVE_COMMAND_OPTIONS,
      {
        name: 'lab-host',
        description: 'Use specific address for Ionic Lab server',
        default: 'localhost',
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'lab-port',
        description: 'Use specific port for Ionic Lab server',
        default: DEFAULT_LAB_PORT.toString(),
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'devapp',
        description: 'Do not publish DevApp service',
        type: Boolean,
        default: true,
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'open',
        description: 'Do not open a browser window',
        type: Boolean,
        default: true,
        // TODO: Adding 'b' to aliases here has some weird behavior with minimist.
      },
      {
        name: 'local',
        description: 'Disable external network usage',
        type: Boolean,
      },
      {
        name: 'browser',
        description: `Specifies the browser to use (${BROWSERS.map(b => chalk.green(b)).join(', ')})`,
        aliases: ['w'],
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'browseroption',
        description: `Specifies a path to open to (${chalk.green('/#/tab/dash')})`,
        aliases: ['o'],
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'lab',
        description: 'Test your apps on multiple platform types in the browser',
        type: Boolean,
        aliases: ['l'],
      },
      {
        name: 'platform',
        description: `Start serve with a specific platform (${['android', 'ios'].map(t => chalk.green(t)).join(', ')})`,
        aliases: ['t'],
      },
      {
        name: 'auth',
        description: 'HTTP Basic Auth password to secure the server on your local network',
        type: String,
        groups: [OptionGroup.Hidden],
      },
    ];

    const exampleCommands = ['', '-c', '--local', '--lab'];

    let longDescription = `
Easily spin up a development server which launches in your browser. It watches for changes in your source files and automatically reloads with the updated build.

By default, ${chalk.green('ionic serve')} boots up a development server on all network interfaces and prints the external address(es) on which your app is being served. It also broadcasts your app to the Ionic DevApp on your network. To disable the DevApp and bind to ${chalk.green('localhost')}, use ${chalk.green('--local')}.

Try the ${chalk.green('--lab')} option to see multiple platforms at once.`;

    try {
      const runner = await this.getRunner();
      const libmetadata = await runner.getCommandMetadata();
      options.push(...libmetadata.options || []);
      longDescription += `\n\n${(libmetadata.longDescription || '').trim()}`;
      exampleCommands.push(...libmetadata.exampleCommands || []);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    return {
      name: 'serve',
      type: 'project',
      description: 'Start a local dev server for app dev/testing',
      longDescription,
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
      this.env.log.warn(`The ${chalk.green('--nolivereload')} option has been deprecated. Please use ${chalk.green('--no-livereload')}.`);
      options['livereload'] = false;
    }

    if (options['nobrowser']) {
      this.env.log.warn(`The ${chalk.green('--nobrowser')} option has been deprecated. Please use ${chalk.green('--no-open')}.`);
      options['open'] = false;
    }

    if (options['b']) {
      options['open'] = false;
    }

    if (options['noproxy']) {
      this.env.log.warn(`The ${chalk.green('--noproxy')} option has been deprecated. Please use ${chalk.green('--no-proxy')}.`);
      options['proxy'] = false;
    }

    if (options['x']) {
      options['proxy'] = false;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { serve } = await import('@ionic/cli-utils/lib/serve');

    await serve(this.env, inputs, options);
  }
}

export class LabCommand extends ServeCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const metadata = await super.getMetadata();
    const groups = [...metadata.groups || [], CommandGroup.Hidden];
    const exampleCommands = [...metadata.exampleCommands || []].filter(c => !c.includes('--lab'));

    return {
      ...metadata,
      description: 'Start Ionic Lab for multi-platform dev/testing',
      longDescription: `
Start an instance of ${chalk.bold('Ionic Lab')}, a tool for developing Ionic apps for multiple platforms at once side-by-side.

${chalk.green('ionic lab')} is just a convenient shortcut for ${chalk.green('ionic serve --lab')}.`,
      groups,
      exampleCommands,
    };
  }
}
