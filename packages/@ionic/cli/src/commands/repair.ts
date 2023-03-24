import { pathExists, remove, unlink } from '@ionic/utils-fs';
import { prettyPath } from '@ionic/utils-terminal';
import path from 'path';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, IProject, ProjectIntegration } from '../definitions';
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
      options: [
        {
          name: 'cordova',
          summary: 'Only perform the repair steps for Cordova platforms and plugins.',
          type: Boolean,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic repair')} outside a project directory.`);
    }

    const { pkgManagerArgs } = await import('../lib/utils/npm');
    const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install' });

    const cordovaOnly = !!options['cordova'];
    const cordova = this.project.getIntegration('cordova');

    if (cordovaOnly && !cordova) {
      throw new FatalException(`${input('--cordova')} was specified, but Cordova has not been added to this project.`);
    }

    if (cordova && !cordova.enabled) {
      this.env.log.warn(`Cordova integration found, but is disabled--not running repair for Cordova.`);
    }

    if (this.env.flags.interactive) {
      const steps: string[] = [];

      if (!cordovaOnly) {
        steps.push(
          `- Remove ${strong('node_modules/')} and ${strong('package-lock.json')}\n` +
          `- Run ${input([installer, ...installerArgs].join(' '))} to restore dependencies\n`
        );
      }

      if (cordova && cordova.enabled) {
        steps.push(
          `- Remove ${strong('platforms/')} and ${strong('plugins/')}\n` +
          `- Run ${input('cordova prepare')} to restore platforms and plugins\n`
        );
      }

      if (steps.length === 0) {
        this.env.log.ok(`${input('ionic repair')} has nothing to do.`);
        throw new FatalException('', 0);
      }

      this.env.log.info(`${input('ionic repair')} will do the following:\n\n` + steps.join(''));
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

    if (!cordovaOnly) {
      await this.npmRepair(this.project);
    }

    if (cordova && cordova.enabled) {
      await this.cordovaRepair(cordova, runinfo);
    }
  }

  async npmRepair(project: IProject) {
    const { pkgManagerArgs } = await import('../lib/utils/npm');
    const [ installer, ...installerArgs ] = await pkgManagerArgs(this.env.config.get('npmClient'), { command: 'install' });

    const tasks = this.createTaskChain();
    const packageLockFile = path.resolve(project.directory, 'package-lock.json');
    const nodeModulesDir = path.resolve(project.directory, 'node_modules');

    tasks.next(`Removing ${strong(prettyPath(packageLockFile))}`);
    const packageLockFileExists = await pathExists(packageLockFile);

    if (packageLockFileExists) {
      await unlink(packageLockFile);
    }

    tasks.next(`Removing ${strong(prettyPath(nodeModulesDir))}`);
    await remove(nodeModulesDir);

    tasks.end();

    await this.env.shell.run(installer, installerArgs, { cwd: project.directory, stdio: 'inherit' });
  }

  async cordovaRepair(cordova: Required<ProjectIntegration>, runinfo: CommandInstanceInfo) {
    const tasks = this.createTaskChain();

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
