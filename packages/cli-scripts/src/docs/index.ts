import * as path from 'path';

import chalk from 'chalk';
import stripAnsi = require('strip-ansi');

import { Command, CommandHelpSchemaInput, CommandHelpSchemaOption, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-framework';
import { fsMkdirp, fsWriteFile, removeDirectory } from '@ionic/cli-framework/utils/fs';
import { strcmp } from '@ionic/cli-framework/utils/string';

import { ProjectType } from '@ionic/cli-utils';
import { CommandHelpSchema, NamespaceSchemaHelpFormatter } from '@ionic/cli-utils/lib/help';
import { generateContext, loadExecutor } from 'ionic';

import { ansi2md, links2md } from './utils';

const PROJECTS_DIRECTORY = path.resolve(__dirname, '..', '..', 'projects');
const STAGING_DIRECTORY = path.resolve(__dirname, '..', '..', '..', '..', 'docs');

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

    const projectTypes: ProjectType[] = ['angular', 'ionic-angular', 'ionic1'];
    const baseCtx = await generateContext();

    for (const projectType of projectTypes) {
      // TODO: possible to do this without a physical directory?
      const ctx = { ...baseCtx, execPath: path.resolve(PROJECTS_DIRECTORY, projectType) };
      const executor = await loadExecutor(ctx, [], {});

      const location = await executor.namespace.locate([]);
      const formatter = new NamespaceSchemaHelpFormatter({ location, namespace: executor.namespace });
      const formatted = await formatter.serialize();
      const projectJson = { type: projectType, ...formatted };

      // TODO: `serialize()` from base formatter isn't typed properly
      projectJson.commands = await Promise.all(projectJson.commands.map(async cmd => this.extractCommand(cmd as CommandHelpSchema)));
      projectJson.commands.sort((a, b) => strcmp(a.name, b.name));

      await fsWriteFile(path.resolve(STAGING_DIRECTORY, `${projectType}.json`), JSON.stringify(projectJson, undefined, 2), { encoding: 'utf8' });
    }

    process.stdout.write(`${chalk.green('Done.')}\n`);
  }

  private async extractCommand(command: CommandHelpSchema): Promise<CommandHelpSchema> {
    return {
      ...command,
      summary: stripAnsi(links2md(ansi2md(command.summary))).trim(),
      description: stripAnsi(links2md(ansi2md(command.description))).trim(),
      inputs: await Promise.all(command.inputs.map(input => this.extractInput(input))),
      options: await Promise.all(command.options.map(opt => this.extractOption(opt))),
    };
  }

  private async extractInput(input: CommandHelpSchemaInput): Promise<CommandHelpSchemaInput> {
    return {
      ...input,
      summary: stripAnsi(links2md(ansi2md(input.summary))).trim(),
    };
  }

  private async extractOption(option: CommandHelpSchemaOption): Promise<CommandHelpSchemaOption> {
    return {
      ...option,
      summary: stripAnsi(links2md(ansi2md(option.summary))).trim(),
    };
  }
}
