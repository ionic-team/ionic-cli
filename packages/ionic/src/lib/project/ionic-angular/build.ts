import { OptionGroup, unparseArgs } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as Debug from 'debug';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularBuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';

import { IonicAngularProject } from './';
import { APP_SCRIPTS_OPTIONS } from './app-scripts';

const debug = Debug('ionic:lib:project:ionic-angular:build');

export const DEFAULT_PROGRAM = 'ionic-app-scripts';
export const DEFAULT_BUILD_SCRIPT_VALUE = `${DEFAULT_PROGRAM} build`;

export interface IonicAngularBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: IonicAngularProject;
}

export class IonicAngularBuildRunner extends BuildRunner<IonicAngularBuildOptions> {
  constructor(protected readonly e: IonicAngularBuildRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      description: `
${chalk.green('ionic build')} uses ${chalk.bold('@ionic/app-scripts')}. See the project's ${chalk.bold('README.md')}[^app-scripts-readme] for documentation. Options not listed below are considered advanced and can be passed to the ${chalk.green('ionic-app-scripts')} CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.
      `,
      footnotes: [
        {
          id: 'app-scripts-readme',
          url: 'https://github.com/ionic-team/ionic-app-scripts/blob/master/README.md',
        },
      ],
      options: [
        {
          name: 'source-map',
          summary: 'Output sourcemaps',
          type: Boolean,
          groups: [OptionGroup.Advanced],
          hint: chalk.dim('[app-scripts]'),
        },
        ...APP_SCRIPTS_OPTIONS,
      ],
      exampleCommands: [
        '--prod',
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicAngularBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    const sourcemaps = typeof options['source-map'] === 'boolean' ? Boolean(options['source-map']) : undefined;

    return {
      ...baseOptions,
      type: 'ionic-angular',
      prod: options['prod'] ? true : false,
      sourcemaps,
      aot: options['aot'] ? true : false,
      minifyjs: options['minifyjs'] ? true : false,
      minifycss: options['minifycss'] ? true : false,
      optimizejs: options['optimizejs'] ? true : false,
      env: options['env'] ? String(options['env']) : undefined,
    };
  }

  async buildProject(options: IonicAngularBuildOptions): Promise<void> {
    const appscripts = new IonicAngularBuildCLI(this.e);
    await appscripts.build(options);
  }
}

export class IonicAngularBuildCLI extends BuildCLI<IonicAngularBuildOptions> {
  readonly name = 'Ionic App Scripts';
  readonly pkg = '@ionic/app-scripts';
  readonly program = DEFAULT_PROGRAM;
  readonly prefix = 'app-scripts';
  readonly script?: string = BUILD_SCRIPT;

  protected buildOptionsToAppScriptsArgs(options: IonicAngularBuildOptions): string[] {
    const minimistArgs = {
      _: [],
      prod: options.prod ? true : false,
      aot: options.aot ? true : false,
      minifyjs: options.minifyjs ? true : false,
      minifycss: options.minifycss ? true : false,
      optimizejs: options.optimizejs ? true : false,
      generateSourceMap: typeof options.sourcemaps !== 'undefined' ? options.sourcemaps ? 'true' : 'false' : undefined,
      target: options.engine === 'cordova' ? 'cordova' : undefined,
      platform: options.platform,
      env: options.env,
    };

    return [...unparseArgs(minimistArgs, { allowCamelCase: true, useEquals: false }), ...options['--']];
  }

  protected async buildArgs(options: IonicAngularBuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const args = this.buildOptionsToAppScriptsArgs(options);

    if (this.resolvedProgram === this.program) {
      return ['build', ...args];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
      return pkgArgs;
    }
  }

  protected async resolveProgram(): Promise<string> {
    if (typeof this.script !== 'undefined') {
      debug(`Looking for ${chalk.cyan(this.script)} npm script.`);

      const pkg = await this.e.project.requirePackageJson();

      if (pkg.scripts && pkg.scripts[this.script]) {
        if (pkg.scripts[this.script] === DEFAULT_BUILD_SCRIPT_VALUE) {
          debug(`Found ${chalk.cyan(this.script)}, but it is the default. Not running.`);
        } else {
          debug(`Using ${chalk.cyan(this.script)} npm script.`);
          return this.e.config.get('npmClient');
        }
      }
    }

    return this.program;
  }
}
