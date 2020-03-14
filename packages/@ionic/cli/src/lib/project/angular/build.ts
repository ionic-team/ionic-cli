import { MetadataGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';

import { AngularBuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';
import { input, weak } from '../../color';

import { AngularProject } from './';

const NG_BUILD_OPTIONS = [
  {
    name: 'configuration',
    aliases: ['c'],
    summary: 'Specify the configuration to use.',
    type: String,
    groups: [MetadataGroup.ADVANCED, 'cordova'],
    hint: weak('[ng]'),
    spec: { value: 'conf' },
  },
  {
    name: 'source-map',
    summary: 'Output source maps',
    type: Boolean,
    groups: [MetadataGroup.ADVANCED, 'cordova'],
    hint: weak('[ng]'),
  },
  {
    name: 'watch',
    summary: 'Rebuild when files change',
    type: Boolean,
    groups: [MetadataGroup.ADVANCED],
    hint: weak('[ng]'),
  },
];

export interface AngularBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: AngularProject;
}

export class AngularBuildRunner extends BuildRunner<AngularBuildOptions> {
  constructor(protected readonly e: AngularBuildRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      description: `
${input('ionic build')} uses the Angular CLI. Use ${input('ng build --help')} to list all Angular CLI options for building your app. See the ${input('ng build')} docs[^ng-build-docs] for explanations. Options not listed below are considered advanced and can be passed to the ${input('ng')} CLI using the ${input('--')} separator after the Ionic CLI arguments. See the examples.
`,
      footnotes: [
        {
          id: 'ng-build-docs',
          url: 'https://angular.io/cli/build',
        },
      ],
      options: [
        {
          name: 'prod',
          summary: `Flag to use the ${input('production')} configuration`,
          type: Boolean,
          hint: weak('[ng]'),
          groups: ['cordova'],
        },
        ...NG_BUILD_OPTIONS,
        {
          name: 'cordova-assets',
          summary: 'Do not bundle Cordova assets during Cordova build',
          type: Boolean,
          groups: [MetadataGroup.HIDDEN, 'cordova'],
          default: true,
        },
      ],
      exampleCommands: [
        '--prod',
        '--watch',
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    const prod = options['prod'] ? Boolean(options['prod']) : undefined;
    const configuration = options['configuration'] ? String(options['configuration']) : (prod ? 'production' : undefined);
    const project = options['project'] ? String(options['project']) : 'app';
    const sourcemaps = typeof options['source-map'] === 'boolean' ? Boolean(options['source-map']) : undefined;
    const cordovaAssets = typeof options['cordova-assets'] === 'boolean' ? Boolean(options['cordova-assets']) : undefined;
    const watch = typeof options['watch'] === 'boolean' ? Boolean(options['watch']) : undefined;

    return {
      ...baseOptions,
      configuration,
      project,
      sourcemaps,
      cordovaAssets,
      watch,
      type: 'angular',
    };
  }

  async buildProject(options: AngularBuildOptions): Promise<void> {
    const ng = new AngularBuildCLI(this.e);
    await ng.build(options);
  }
}

export class AngularBuildCLI extends BuildCLI<AngularBuildOptions> {
  readonly name = 'Angular CLI';
  readonly pkg = '@angular/cli';
  readonly program = 'ng';
  readonly prefix = 'ng';
  readonly script = BUILD_SCRIPT;

  protected async buildArgs(options: AngularBuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const args = await this.buildOptionsToNgArgs(options);

    if (this.resolvedProgram === this.program) {
      return [...this.buildArchitectCommand(options), ...args];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
      return pkgArgs;
    }
  }

  protected async buildOptionsToNgArgs(options: AngularBuildOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      'source-map': options.sourcemaps !== false ? options.sourcemaps : 'false',
      'cordova-assets': options.cordovaAssets !== false ? undefined : 'false',
      'watch': options.watch !== false ? options.watch : 'false',
    };

    const projectArgs = [];
    let separatedArgs = options['--'];

    if (options.engine === 'cordova') {
      const integration = this.e.project.requireIntegration('cordova');
      args.platform = options.platform;

      if (this.e.project.rootDirectory !== integration.root) {
        args.cordovaBasePath = integration.root;
      }

      separatedArgs = [];
    }

    if (this.resolvedProgram !== this.program) {
      if (options.configuration) {
        projectArgs.push(`--configuration=${options.configuration}`);
      }

      if (options.project) {
        projectArgs.push(`--project=${options.project}`);
      }
    }

    if (options.verbose) {
      projectArgs.push('--verbose');
    }

    return [...unparseArgs(args), ...projectArgs, ...separatedArgs];
  }

  protected buildArchitectCommand(options: AngularBuildOptions): string[] {
    const cmd = options.engine === 'cordova' ? 'ionic-cordova-build' : 'build';

    return ['run', `${options.project}:${cmd}${options.configuration ? `:${options.configuration}` : ''}`];
  }
}
