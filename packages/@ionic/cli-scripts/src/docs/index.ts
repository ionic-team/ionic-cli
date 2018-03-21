import * as path from 'path';

import chalk from 'chalk';
// import * as lodash from 'lodash';
// import stripAnsi = require('strip-ansi');

import { Command, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-framework';
import { fsMkdirp, removeDirectory } from '@ionic/cli-framework/utils/fs';

// import { ProjectType } from '@ionic/cli-utils';
// import { BaseProject } from '@ionic/cli-utils/lib/project';
// import { generateRootPlugin } from 'ionic';

// import { ansi2md, links2md } from './utils';

export class DocsCommand extends Command {
  stagingPath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs');

  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'docs',
      summary: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    await removeDirectory(this.stagingPath);
    await fsMkdirp(this.stagingPath);

    // const projectTypes: ProjectType[] = ['angular'];

    // for (const projectType of projectTypes) {
    //   const project = await BaseProject.createFromProjectType(projectType);
    //   const commands = await this.getCommandList(env);

    //   for (const command of commands) {
    //     const commandPath = ['ionic', ...command.path.map(([p]) => p)];
    //     const fullName = commandPath.join(' ');

    //     const commandJson = {
    //       ...lodash.pick(command, ['type', 'exampleCommands', 'aliases']),
    //       name: fullName,
    //       summary: command.description,
    //       description: command.longDescription ? stripAnsi(links2md(ansi2md(command.longDescription))) : '',
    //     };

    //     console.log(commandJson);
    //     return;
    //   }
    // }

    process.stdout.write(`${chalk.green('Done.')}\n`);
  }

  // private async getCommandList(env: IonicEnvironment) {
  //   const commands = await env.namespace.getCommandMetadataList()
  //   return commands.filter(cmd => !cmd.groups || !cmd.groups.includes(CommandGroup.Hidden));
  // }
}
