import { MetadataGroup, validators } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { slugify } from '@ionic/cli-framework/utils/string';
import * as path from 'path';

import { MODERN_PROJECT_TYPES, PROJECT_FILE } from '../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, IProject, ProjectType } from '../definitions';
import { input, strong, weak } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { MultiProjectConfig, ProjectDetails, createProjectFromDetails, prettyProjectName } from '../lib/project';

export class InitCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'init',
      type: 'global',
      summary: 'Initialize existing projects with Ionic',
      description: `
This command will initialize an Ionic app within the current directory. Usually, this means an ${input(PROJECT_FILE)} file is created. If used within a multi-app project, the app is initialized in the root ${input(PROJECT_FILE)}.

${input('ionic init')} will prompt for a project name and then proceed to determine the type of your project. You can specify the ${input('name')} argument and ${input('--type')} option to provide these values via command-line.

If the ${input('--multi-app')} flag is specified, this command will initialize your project as a multi-app project, allowing for apps within monorepos and unconventional repository structures. See the multi-app docs[^multi-app-docs] for details. Once a multi-app project is initialized, you can run ${input('ionic init')} again within apps in your project to initialize them.
      `,
      exampleCommands: [
        '',
        '"My App"',
        '"My App" --type=angular',
        '--multi-app',
      ],
      inputs: [
        {
          name: 'name',
          summary: `The name of your project (e.g. ${input('myApp')}, ${input('"My App"')})`,
        },
      ],
      options: [
        {
          name: 'type',
          summary: `Type of project (e.g. ${MODERN_PROJECT_TYPES.map(type => input(type)).join(', ')})`,
        },
        {
          name: 'force',
          summary: 'Initialize even if a project already exists',
          type: Boolean,
          aliases: ['f'],
          default: false,
        },
        {
          name: 'multi-app',
          summary: 'Initialize a multi-app project',
          type: Boolean,
          default: false,
        },
        {
          name: 'project-id',
          summary: 'Specify a slug for your app',
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'slug' },
          hint: weak('[multi-app]'),
        },
        {
          name: 'default',
          summary: 'Mark the initialized app as the default project',
          type: Boolean,
          groups: [MetadataGroup.ADVANCED],
          hint: weak('[multi-app]'),
        },
      ],
      groups: [MetadataGroup.BETA],
      footnotes: [
        {
          id: 'multi-app-docs',
          url: 'https://ionicframework.com/docs/cli/configuration#multi-app-projects',
          shortUrl: 'https://ion.link/multi-app-docs',
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const force = options['force'] ? true : false;

    if (this.project && !force) {
      // TODO: check for existing project config in multi-app

      if (this.project.details.context === 'app' || (this.project.details.context === 'multiapp' && options['multi-app'])) {
        throw new FatalException(
          `Existing Ionic project file found: ${strong(prettyPath(this.project.filePath))}\n` +
          `You can re-initialize your project using the ${input('--force')} option.`
        );
      }
    }

    if (!options['multi-app']) {
      if (!inputs[0]) {
        const name = await this.env.prompt({
          type: 'input',
          name: 'name',
          message: 'Project name:',
          validate: v => validators.required(v),
        });

        inputs[0] = name;
      }

      if (!options['type']) {
        const details = new ProjectDetails({ rootDirectory: this.env.ctx.execPath, e: this.env });
        options['type'] = await details.getTypeFromDetection();
      }

      if (!options['type']) {
        if (this.env.flags.interactive) {
          this.env.log.warn(
            `Could not determine project type.\n` +
            `Please choose a project type from the list.`
          );
          this.env.log.nl();
        }

        const type = await this.env.prompt({
          type: 'list',
          name: 'type',
          message: 'Project type:',
          choices: MODERN_PROJECT_TYPES.map(t => ({
            name: `${prettyProjectName(t)} (${input(t)})`,
            value: t,
          })),
        });

        options['type'] = type;
      }
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (options['multi-app']) {
      await this.initializeMultiProject(inputs, options);
    } else {
      await this.initializeApp(inputs, options);
    }

    this.env.log.ok('Your Ionic project has been initialized!');
  }

  async initializeMultiProject(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const configPath = this.getProjectFilePath();
    const config = new MultiProjectConfig(configPath);

    config.c = { projects: {} };
  }

  async initializeApp(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const name = inputs[0] ? inputs[0].trim() : '';
    const type = options['type'] ? String(options['type']) as ProjectType : undefined;
    const projectId = options['project-id'] ? String(options['project-id']) : slugify(name); // TODO validate --project-id

    if (!name) {
      throw new FatalException(
        `Project name not specified.\n` +
        `Please specify ${input('name')}, the first argument of ${input('ionic init')}. See ${input('ionic init --help')} for details.`
      );
    }

    if (!type) {
      throw new FatalException(
        `Could not determine project type.\n` +
        `Please specify ${input('--type')}. See ${input('ionic init --help')} for details.`
      );
    }

    let project: IProject | undefined;

    if (this.project && this.project.details.context === 'multiapp') {
      const configPath = path.resolve(this.project.rootDirectory, PROJECT_FILE);
      const projectRoot = path.relative(this.project.rootDirectory, this.env.ctx.execPath);
      const config = new MultiProjectConfig(configPath);

      if (!projectRoot) {
        if (this.env.flags.interactive) {
          this.env.log.warn(
            `About to initialize app in the root directory of your multi-app project.\n` +
            `Please confirm that you want your app initialized in the root of your multi-app project. If this wasn't intended, please ${input('cd')} into the appropriate directory and run ${input('ionic init')} again.\n`
          );
        }

        const confirm = await this.env.prompt({
          type: 'confirm',
          message: 'Continue?',
          default: false,
        });

        if (!confirm) {
          throw new FatalException(`Not initializing app in root directory.`);
        }
      }

      const defaultProject = config.get('defaultProject');

      if (!defaultProject && typeof options['default'] !== 'boolean') {
        const confirm = await this.env.prompt({
          type: 'confirm',
          message: `Would you like to make this app the default project?`,
          default: true,
        });

        if (confirm) {
          options['default'] = true;
        }
      }

      if (options['default']) {
        config.set('defaultProject', projectId);
      }

      project = await createProjectFromDetails({ context: 'multiapp', configPath, id: projectId, type, errors: [] }, this.env);
      project.config.set('root', projectRoot);
    } else {
      const configPath = this.getProjectFilePath();
      project = await createProjectFromDetails({ context: 'app', configPath, type, errors: [] }, this.env);
    }

    project.config.set('name', name);
    project.config.set('type', type);
  }

  getProjectFilePath(): string {
    return path.resolve(this.env.ctx.execPath, PROJECT_FILE);
  }
}
