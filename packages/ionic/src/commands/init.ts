import { CommandGroup, OptionGroup, validators } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { slugify } from '@ionic/cli-framework/utils/string';
import chalk from 'chalk';
import * as path from 'path';

import { PROJECT_FILE, PROJECT_TYPES } from '../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, IProject, ProjectType } from '../definitions';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { ProjectDetails, createProjectFromDetails, prettyProjectName } from '../lib/project';

export class InitCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'init',
      type: 'global',
      summary: 'Initialize existing projects with Ionic',
      description: `
This command will initialize the current directory with an ${chalk.bold(PROJECT_FILE)} file.

${chalk.green('ionic init')} will prompt for a project name and then proceed to determine the type of your project. You can specify the ${chalk.green('name')} argument and ${chalk.green('--type')} option to provide these values via command-line.
      `,
      exampleCommands: [
        '',
        '"My App"',
        '"My App" --type=angular',
      ],
      inputs: [
        {
          name: 'name',
          summary: `The name of your project (e.g. ${chalk.green('myApp')}, ${chalk.green('"My App"')})`,
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'type',
          summary: `Type of project (e.g. ${PROJECT_TYPES.map(type => chalk.green(type)).join(', ')})`,
        },
        {
          name: 'force',
          summary: 'Initialize even if a project already exists',
          type: Boolean,
          aliases: ['f'],
          default: false,
        },
        {
          name: 'project-id',
          summary: 'Specify a slug for your app',
          groups: [OptionGroup.Advanced],
          spec: { value: 'slug' },
        },
      ],
      groups: [CommandGroup.Beta],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const force = options['force'] ? true : false;

    if (this.project && this.project.details.context === 'app' && !force) {
      // TODO: check for existing project config in multi-app
      throw new FatalException(
        `Existing Ionic project file found: ${chalk.bold(prettyPath(this.project.filePath))}\n` +
        `You can re-initialize your project using the ${chalk.green('--force')} option.`
      );
    }

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
        choices: PROJECT_TYPES.map(t => ({
          name: `${prettyProjectName(t)} (${chalk.green(t)})`,
          value: t,
        })),
      });

      options['type'] = type;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const name = inputs[0].trim();
    const type = options['type'] ? String(options['type']) as ProjectType : undefined;
    const projectId = options['project-id'] ? String(options['project-id']) : slugify(name); // TODO validate --project-id

    if (!type) {
      throw new FatalException(
        `Could not determine project type.\n` +
        `Please specify ${chalk.green('--type')}. See ${chalk.green('ionic init --help')} for details.`
      );
    }

    let project: IProject | undefined;

    if (this.project && this.project.details.context === 'multiapp') {
      project = await createProjectFromDetails({ context: 'multiapp', configPath: path.resolve(this.project.rootDirectory, PROJECT_FILE), id: projectId, type, errors: [] }, this.env);
      project.config.set('root', path.relative(this.project.rootDirectory, this.env.ctx.execPath));
    } else {
      project = await createProjectFromDetails({ context: 'app', configPath: path.resolve(this.env.ctx.execPath, PROJECT_FILE), type, errors: [] }, this.env);
    }

    project.config.set('name', name);
    project.config.set('type', type);

    this.env.log.ok('Your Ionic project has been initialized!');
  }
}
