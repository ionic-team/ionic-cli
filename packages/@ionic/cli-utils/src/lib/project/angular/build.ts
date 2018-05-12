import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as Debug from 'debug';
import { CommandGroup, OptionGroup } from '../../../constants';

import { AngularBuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';
import { addCordovaEngineForAngular, removeCordovaEngineForAngular } from './utils';

const debug = Debug('ionic:cli-utils:lib:project:angular:build');

// Setting all types to `String` so that they can be filtered when not provided.
// Is there a way to have Boolean types without them defaulting to false?
export const NG_BUILD_OPTIONS = [
  {
    name: 'prod',
    summary: `Flag to set configuration to ${chalk.green('prod')}`,
    type: String,
    hint: 'ng',
  },
  {
    name: 'project',
    summary: 'Specify the project to use',
    type: String,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'configuration',
    summary: 'Specify the configuration to use',
    aliases: ['c'],
    type: String,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'main',
    summary: 'The name of the main entry-point file',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'polyfills',
    summary: 'The name of the polyfills file',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'ts-config',
    summary: 'The name of the TypeScript configuration file',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'optimization',
    summary: 'Defines the optimization level of the build',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'aot',
    summary: 'Build using Ahead of Time compilation',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'source-map',
    summary: 'Output sourcemaps.',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'eval-source-map',
    summary: 'Output in-file eval sourcemaps',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'vendor-chunk',
    summary: 'Use a separate bundle containing only vendor libraries',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'common-chunk',
    summary: 'Use a separate bundle containing code used across multiple bundles',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'base-href',
    summary: 'Base url for the application being built',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'deploy-url',
    summary: 'URL where files will be deployed',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'progress',
    summary: 'Log progress to the console while building',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'i18n-file',
    summary: 'Localization file to use for i18n',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'i18n-format',
    summary: `Format of the localization file specified with ${chalk.green('--i18n-file')}`,
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'i18n-locale',
    summary: 'Locale to use for i18n',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'i18n-missing-translation',
    summary: 'How to handle missing translations for i18n',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'extract-css',
    summary: 'Extract css from global styles onto css files instead of js ones',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'watch',
    summary: 'Run build when files change',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'output-hashing',
    summary: 'Define the output filename cache-busting hashing mode',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'poll',
    summary: 'Enable and define the file watching poll time period in milliseconds',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'delete-output-path',
    summary: 'Delete the output path before building',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'preserve-symlinks',
    summary: 'Do not use the real path when resolving modules',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'extract-licenses',
    summary: 'Extract all licenses in a separate file, in the case of production builds only',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'show-circular-dependencies',
    summary: 'Show circular dependency warnings on builds',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'build-optimizer',
    summary: `Enables @angular-devkit/build-optimizer optimizations when using the ${chalk.green('aot')} option`,
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'named-chunks',
    summary: 'Use file name for lazy loaded chunks',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'subresource-integrity',
    summary: 'Enables the use of subresource integrity validation',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'service-worker',
    summary: 'Generates a service worker config for production builds',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'ngsw-config-path',
    summary: 'Path to ngsw-config.json',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'skip-app-shell',
    summary: 'Flag to prevent building an app shell',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'index',
    summary: 'The name of the index HTML file',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'stats-json',
    summary: `Generates a ${chalk.green('stats.json')} file which can be analyzed using tools such as: #webpack-bundle-analyzer or https: //webpack.github.io/analyse`,
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'fork-type-checker',
    summary: 'Run the TypeScript type checker in a forked process',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  // These angular CLI options either conflict with or are managed by Ionic.
  // Adding an `ng` prefix here to prevent collisions.
  {
    name: 'ng-output-path',
    summary: 'Path where output will be placed',
    type: String,
    groups: [OptionGroup.Hidden],
    hint: 'ng',
  },
  {
    name: 'ng-verbose',
    summary: 'Adds more details to output logging',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
];

export class BuildRunner extends BaseBuildRunner<AngularBuildOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [CommandGroup.Experimental],
      exampleCommands: ['--prod', '-- --extract-css=true'],
      description: `
${chalk.green('ionic build')} uses the Angular CLI. Use ${chalk.green('ng build --help')} to list all Angular CLI options for building your app. See the ${chalk.green('ng build')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the ${chalk.green('ng')} CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/build')}`,
      options: NG_BUILD_OPTIONS,
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    const ngOptions = NG_BUILD_OPTIONS
      .filter(option => options[option.name] !== null && options[option.name] !== undefined)
      .reduce((accum, option) => {
        accum[option.name] = option.type.call(option.type, options[option.name]);

        return accum;
      }, {} as any);

    return {
      ...baseOptions,
      ...ngOptions,
      type: 'angular',
    };
  }

  async buildOptionsToNgArgs(options: AngularBuildOptions): Promise<string[]> {

    const ngOptions = NG_BUILD_OPTIONS
      .filter(option => option.name)
      .map(option => option.name as keyof AngularBuildOptions)
      .filter(option => options[option] !== null && options[option] !== undefined)
      .reduce((accum, option) => {
        accum[option] = String(options[option]);

        return accum;
      }, {} as any);

    const args: ParsedArgs = {
      _: [],
      ...ngOptions,
      'output-path': 'www',
    };

    // TODO: This is pretty hacky. Is there a better solution?
    if (options.engine === 'cordova' && options.platform === 'android') {
      if (!args['base-href'] && !options['--'].find(o => o.startsWith('--base-href'))) {
        args['base-href'] = 'file:///android_asset/www/';
      }
    }

    return [...unparseArgs(args, {}), ...options['--']];
  }

  async beforeBuild(options: AngularBuildOptions): Promise<void> {

    await super.beforeBuild(options);

    const p = await this.project.load();

    if (p.integrations.cordova && p.integrations.cordova.enabled !== false && options.engine === 'cordova' && options.platform) {
      await addCordovaEngineForAngular(this.project, options.platform, options.project);
    }
  }

  async buildProject(options: AngularBuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.config.load();
    const { npmClient } = config;
    const pkg = await this.project.requirePackageJson();

    const args = await this.buildOptionsToNgArgs(options);
    const shellOptions = { cwd: this.project.directory };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: BUILD_SCRIPT });
      await this.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.shell.run('ng', ['build', ...args], shellOptions);
    }
  }

  async afterBuild(options: AngularBuildOptions): Promise<void> {
    const p = await this.project.load();

    if (p.integrations.cordova && p.integrations.cordova.enabled !== false && options.engine === 'cordova' && options.platform) {
      await removeCordovaEngineForAngular(this.project, options.platform, options.project);
    }

    await super.afterBuild(options);
  }
}
