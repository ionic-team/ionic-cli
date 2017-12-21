import chalk from 'chalk';

import { AppDetails, BACKEND_LEGACY, BACKEND_PRO, CommandData, CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { PROJECT_FILE } from '@ionic/cli-utils/lib/project';

const CHOICE_CREATE_NEW_APP = 'createNewApp';
const CHOICE_NEVERMIND = 'nevermind';

export class LinkCommand extends Command implements CommandPreRun {
  metadata: CommandData = {
    name: 'link',
    type: 'project',
    backends: [BACKEND_LEGACY, BACKEND_PRO],
    description: 'Connect your local app to Ionic',
    longDescription: `
If you have an app on Ionic, you can link it to this local Ionic project with this command.

Excluding the ${chalk.green('app_id')} argument looks up your apps on Ionic and prompts you to select one.

This command simply sets the ${chalk.bold('app_id')} property in ${chalk.bold(PROJECT_FILE)} for other commands to read.
    `,
    exampleCommands: ['', 'a1b2c3d4'],
    inputs: [
      {
        name: 'app_id',
        description: `The ID of the app to link (e.g. ${chalk.green('a1b2c3d4')})`,
      },
    ],
    options: [
      {
        name: 'name',
        description: 'The app name to use during the linking of a new app',
      },
      {
        name: 'create',
        description: 'Create a new app on Ionic and link it with this local Ionic project',
        backends: [BACKEND_PRO],
        type: Boolean,
        visible: false,
      },
      {
        name: 'pro-id',
        description: 'Specify an app ID from the Ionic Dashboard to link',
        visible: false,
      },
    ],
  };

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { create } = options;

    if (inputs[0] && create) {
      throw new FatalException(`Sorry--cannot use both ${chalk.green('app_id')} and ${chalk.green('--create')}. You must either link an existing app or create a new one.`);
    }

    let proAppId = <string>options['pro-id'] || '';
    const config = await this.env.config.load();

    if (proAppId) {
      if (config.backend !== BACKEND_PRO) {
        await this.env.runCommand(['config', 'set', '-g', 'backend', 'pro'], { showExecution: false });
        this.env.log.nl();
        this.env.log.info(
          `${chalk.bold(chalk.blue.underline('Welcome to Ionic Pro!') + ' The CLI is now set up to use Ionic Pro services.')}\n` +
          `You can revert back to Ionic Cloud (legacy) services at any time:\n\n` +
          `${chalk.green('ionic config set -g backend legacy')}\n`
        );
      }

      inputs[0] = proAppId;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');
    const { App } = await import('@ionic/cli-utils/lib/app');

    let [ appId ] = inputs;
    let { create, name } = options;

    const config = await this.env.config.load();
    const project = await this.env.project.load();

    if (project.app_id) {
      if (project.app_id === appId) {
        this.env.log.info(`Already linked with app ${chalk.green(appId)}.`);
        return;
      }

      const msg = appId ?
        `Are you sure you want to link it to ${chalk.green(appId)} instead?` :
        `Would you like to link it to a different app?`;

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `App ID ${chalk.green(project.app_id)} is already set up with this app. ${msg}`,
      });

      if (!confirm) {
        this.env.log.info('Not linking.');
        return;
      }
    }

    if (!(await this.env.session.isLoggedIn())) {
      await promptToLogin(this.env);
    }

    if (config.backend === BACKEND_PRO && !config.git.setup) {
      await this.env.runCommand(['ssh', 'setup']);
    }

    if (appId) {
      this.env.tasks.next(`Looking up app ${chalk.green(appId)}`);

      const token = await this.env.session.getAppUserToken(appId);
      const appUtil = new App(token, this.env.client);
      await appUtil.load(appId);

      this.env.tasks.end();

    } else if (!create) {
      this.env.tasks.next(`Looking up your apps`);
      let apps: AppDetails[] = [];

      const token = await this.env.session.getUserToken();
      const appUtil = new App(token, this.env.client);
      const paginator = await appUtil.paginate();

      for (let r of paginator) {
        const res = await r;
        apps = apps.concat(res.data);
      }

      this.env.tasks.end();

      const createAppChoice = {
        name: 'Create a new app',
        id: CHOICE_CREATE_NEW_APP,
      };

      const neverMindChoice = {
        name: 'Nevermind',
        id: CHOICE_NEVERMIND,
      };

      const linkedApp = await this.env.prompt({
        type: 'list',
        name: 'linkedApp',
        message: `Which app would you like to link`,
        choices: [createAppChoice, ...apps, neverMindChoice].map(app => ({
          name: [CHOICE_CREATE_NEW_APP, CHOICE_NEVERMIND].includes(app.id) ? chalk.bold(app.name) : `${app.name} (${app.id})`,
          value: app.id,
        })),
      });

      appId = linkedApp;
    }

    if (create || appId === CHOICE_CREATE_NEW_APP) {
      const token = await this.env.session.getUserToken();

      if (config.backend === BACKEND_PRO) {
        if (!name) {
          name = await this.env.prompt({
            type: 'input',
            name: 'name',
            message: 'Please enter a name for your new app:',
          });
        }

        const appUtil = new App(token, this.env.client);
        const app = await appUtil.create({ name: String(name) });

        appId = app.id;
        await this.env.runCommand(['config', 'set', 'app_id', `"${appId}"`, '--json']);
        await this.env.runCommand(['git', 'remote']);

        this.env.log.ok(`Project linked with app ${chalk.green(appId)}!`);
      } else {
        const opn = await import('opn');
        const dashUrl = await this.env.config.getDashUrl();
        opn(`${dashUrl}/?user_token=${token}`, { wait: false });
        this.env.log.info(`Rerun ${chalk.green(`ionic link`)} to link to the new app.`);
      }
    } else if (appId === CHOICE_NEVERMIND) {
      this.env.log.info('Not linking app.');
    } else {
      await this.env.runCommand(['config', 'set', 'app_id', `"${appId}"`, '--json']);

      if (config.backend === BACKEND_PRO) {
        await this.env.runCommand(['git', 'remote']);
      }

      this.env.log.ok(`Project linked with app ${chalk.green(appId)}!`);
    }

    await Promise.all([this.env.config.save(), this.env.project.save()]);
  }
}
