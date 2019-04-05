import { prettyPath } from '@ionic/cli-framework/utils/format';
import { remove, unlink } from '@ionic/utils-fs';
import * as path from 'path';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, IProject } from '../definitions';
import { input, strong } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { runCommand } from '../lib/executor';

export class RepairCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'repair',
      type: 'project',
      summary: 'Remove and recreate dependencies and generated files',
      description: `
This command may be useful when obscure errors or issues are encountered. It removes and recreates dependencies of your project.

For Cordova apps, it removes and recreates the generated native project and the native dependencies of your project.
`,
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic repair')} outside a project directory.`);
    }

    const { pkgManagerArgs } = await import('../lib/utils/npm');
    const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install' });

    const cordova = this.project.getIntegration('cordova');

    if (this.env.flags.interactive) {
      this.env.log.info(
        `${input('ionic repair')} will do the following:\n\n` +
        `- Remove ${strong('node_modules/')} and ${strong('package-lock.json')}\n` +
        `- Run ${input([installer, ...installerArgs].join(' '))} to restore dependencies\n` +
        (cordova && cordova.enabled ?
          `- Remove ${strong('platforms/')} and ${strong('plugins/')}\n` +
          `- Run ${input('cordova prepare')} to restore platforms and plugins\n` : '')
      );
    }

    const confirm = await this.env.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Continue?',
      default: false,
    });

    if (!confirm) {
      throw new FatalException(`Not running ${input('ionic repair')}.`);
    }

    this.env.log.nl();

    await this.npmRepair(this.project);
    await this.cordovaRepair(this.project, runinfo);
  }

  async npmRepair(project: IProject) {
    const { pkgManagerArgs } = await import('../lib/utils/npm');
    const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install' });

    const tasks = this.createTaskChain();
    const packageLockFile = path.resolve(project.directory, 'package-lock.json');
    const nodeModulesDir = path.resolve(project.directory, 'node_modules');

    tasks.next(`Removing ${strong(prettyPath(packageLockFile))}`);
    await unlink(packageLockFile);

    tasks.next(`Removing ${strong(prettyPath(nodeModulesDir))}`);
    await remove(nodeModulesDir);

    tasks.end();

    await this.env.shell.run(installer, installerArgs, { cwd: project.directory, stdio: 'inherit' });
  }

  async cordovaRepair(project: IProject, runinfo: CommandInstanceInfo) {
    const tasks = this.createTaskChain();
    const cordova = project.getIntegration('cordova');

    if (cordova && cordova.enabled) {
      const platformsDir = path.resolve(cordova.root, 'platforms');
      const pluginsDir = path.resolve(cordova.root, 'plugins');

      tasks.next(`Removing ${strong(prettyPath(platformsDir))}`);
      await remove(platformsDir);

      tasks.next(`Removing ${strong(prettyPath(pluginsDir))}`);
      await remove(pluginsDir);

      tasks.end();

      await runCommand(runinfo, ['cordova', 'prepare', '--no-build']);
    }
  }
}
