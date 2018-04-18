import * as path from 'path';

import chalk from 'chalk';
import stripAnsi = require('strip-ansi');
import * as lodash from 'lodash';

import { Command, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-framework';
import { filter } from '@ionic/cli-framework/utils/array';
import { fsMkdirp, fsWriteFile, removeDirectory } from '@ionic/cli-framework/utils/fs';
import { strcmp } from '@ionic/cli-framework/utils/string';

import { CommandMetadataOption, HydratedCommandMetadata, INamespace, ProjectType } from '@ionic/cli-utils';
import { isCommandHidden, isOptionHidden } from '@ionic/cli-utils/lib/help';
import { generateContext, loadExecutor } from 'ionic';

import { ansi2md, links2md } from './utils';

const PROJECTS_DIRECTORY = path.resolve(__dirname, '..', '..', 'projects');
const STAGING_DIRECTORY = path.resolve(__dirname, '..', '..', '..', '..', 'docs');

interface CommandOptionJson {
  name: string;
  summary: string;
  aliases: string[];
  default?: any;
}

interface CommandJson {
  name: string;
  namespace: string[];
  summary: string;
  description: string;
  type: string;
  exampleCommands: string[];
  aliases: string[];
  options: CommandOptionJson[];
}

interface ProjectJson {
  type: ProjectType;
  commands: CommandJson[];
}

export class DocsCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'docs',
      summary: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    await removeDirectory(STAGING_DIRECTORY);
    await fsMkdirp(STAGING_DIRECTORY);

    const projectTypes: ProjectType[] = ['ionic-angular', 'ionic1']; // TODO: add 'angular'
    const baseCtx = await generateContext();

    for (const projectType of projectTypes) {
      const projectJson: ProjectJson = {
        type: projectType,
        commands: [],
      };

      // TODO: possible to do this without a physical directory?
      const ctx = { ...baseCtx, execPath: path.resolve(PROJECTS_DIRECTORY, projectType) };
      const executor = await loadExecutor(ctx, [], {});
      const env = executor.namespace.env;

      const commands = await this.getCommandList(executor.namespace);

      projectJson.commands = await Promise.all(commands.map(async cmd => this.extractCommand(cmd)));
      projectJson.commands.sort((a, b) => strcmp(a.name, b.name));

      await fsWriteFile(path.resolve(STAGING_DIRECTORY, `${projectType}.json`), JSON.stringify(projectJson, undefined, 2), { encoding: 'utf8' });

      env.close();
    }

    process.stdout.write(`${chalk.green('Done.')}\n`);
  }

  private async extractCommand(command: HydratedCommandMetadata): Promise<CommandJson> {
    const commandPath = ['ionic', ...command.path.map(([p]) => p)];
    const namespacePath = lodash.initial(commandPath);
    const name = commandPath.join(' ');
    const summary = command.summary ? stripAnsi(links2md(ansi2md(command.summary))).trim() : '';
    const description = command.description ? stripAnsi(links2md(ansi2md(command.description))).trim() : '';
    const type = command.type;
    const exampleCommands = command.exampleCommands ? command.exampleCommands.map(c => `${name} ${c}`) : [];
    const aliases = command.aliases.map(a => [...namespacePath, a].join(' '));
    const filteredOptions = await filter(command.options ? command.options : [], async opt => isOptionHidden(opt));
    const options = await Promise.all(filteredOptions.map(async opt => this.extractOption(opt)));

    return { name, namespace: namespacePath, summary, description, type, exampleCommands, aliases, options };
  }

  private async extractOption(option: CommandMetadataOption): Promise<CommandOptionJson> {
    const name = option.name;
    const summary = option.summary ? stripAnsi(links2md(ansi2md(option.summary))).trim() : '';
    const aliases = option.aliases ? option.aliases : [];

    return { name, summary, default: option.default, aliases };
  }

  private async getCommandList(namespace: INamespace) {
    return filter(await namespace.getCommandMetadataList(), async cmd => isCommandHidden(cmd));
  }
}
