import * as chalk from 'chalk';

import {
  AppDetails,
  BACKEND_LEGACY,
  BACKEND_PRO,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  PROJECT_FILE,
  createFatalAPIFormat,
  isAppResponse,
  isAppsResponse,
  prettyPath,
  promptToLogin,
} from '@ionic/cli-utils';

const CREATE_NEW_APP_CHOICE = 'createNewApp';

@CommandMetadata({
  name: 'link',
  type: 'project',
  backends: [BACKEND_LEGACY, BACKEND_PRO],
  description: 'Connect your local app to Ionic',
  longDescription: `
If you have an app on Ionic, you can link it to this local Ionic project with this command.

Excluding the ${chalk.green('app_id')} argument looks up your apps on Ionic and prompts you to select one.

This command simply sets the ${chalk.bold('app_id')} property in ${chalk.bold(PROJECT_FILE)} for other commands to read.
  `,
  exampleCommands: ['', 'a1b2c3d4', '--create --name "My New App"'],
  inputs: [
    {
      name: 'app_id',
      description: `The ID of the app to link (e.g. ${chalk.green('a1b2c3d4')})`,
      required: false,
    },
  ],
  options: [
    {
      name: 'create',
      description: 'Create a new app on Ionic and link it with this local Ionic project',
      backends: [BACKEND_PRO],
      type: Boolean,
    },
    {
      name: 'name',
      description: 'The app name to use during the linking of a new app',
    },
  ],
})
export class LinkCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ appId ] = inputs;
    const { create } = options;

    if (appId && create) {
      throw this.exit(`Sorry--cannot use both ${chalk.green('app_id')} and ${chalk.green('--create')}. You must either link an existing app or create a new one.`);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { findSSHConfigHostSection, getSSHConfigPath, loadSSHConfig } = await import('../lib/ssh-config');

    let [ appId ] = inputs;
    let { create, name } = options;

    const config = await this.env.config.load();
    const project = await this.env.project.load();

    if (project.app_id) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `App ID ${chalk.green(project.app_id)} already exists in project config. Would you like to link a different app?`
      });

      if (!confirm) {
        this.env.log.info('Not linking.');
        return;
      }
    }

    if (!(await this.env.session.isLoggedIn())) {
      await promptToLogin(this.env);
    }

    if (config.backend === BACKEND_PRO) {
      const sshConfigPath = getSSHConfigPath();
      const conf = await loadSSHConfig(sshConfigPath);

      if (!findSSHConfigHostSection(conf, config.git.host)) {
        this.env.log.info(`SSH config settings for ${chalk.bold(config.git.host)} not found in ${chalk.bold(prettyPath(sshConfigPath))}.`);
        this.env.log.info('Running automatic SSH setup.');
        await this.runcmd(['ssh', 'setup']);
      }
    }

    if (appId) {
      if (appId === project.app_id) {
        return this.env.log.info(`Already linked with app ${chalk.bold(appId)}.`);
      }

      this.env.tasks.next(`Looking up app ${chalk.bold(appId)}`);

      const token = await this.env.session.getAppUserToken(appId);
      const req = this.env.client.make('GET', `/apps/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      const res = await this.env.client.do(req);

      if (!isAppResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      this.env.tasks.end();

    } else if (!create) {
      this.env.tasks.next(`Looking up your apps`);
      let apps: AppDetails[] = [];

      const token = await this.env.session.getUserToken();
      const paginator = this.env.client.paginate(
        () => this.env.client.make('GET', '/apps').set('Authorization', `Bearer ${token}`),
        isAppsResponse
      );

      for (let r of paginator) {
        const res = await r;
        apps = apps.concat(res.data);
      }

      this.env.tasks.end();

      const createAppChoice = {
        name: 'Create a new app',
        id: CREATE_NEW_APP_CHOICE,
      };

      const linkedApp = await this.env.prompt({
        type: 'list',
        name: 'linkedApp',
        message: `Which app would you like to link`,
        choices: [createAppChoice, ...apps].map((app) => ({
          name: app.id !== CREATE_NEW_APP_CHOICE ? `${app.name} (${app.id})` : chalk.bold(app.name),
          value: app.id
        }))
      });

      appId = linkedApp;
    }

    if (create || appId === CREATE_NEW_APP_CHOICE) {
      const token = await this.env.session.getUserToken();

      if (config.backend === BACKEND_PRO) {
        if (!name) {
          name = await this.env.prompt({
            type: 'input',
            name: 'name',
            message: 'Please enter a name for your new app:',
          });
        }

        const req = this.env.client.make('POST', '/apps')
          .set('Authorization', `Bearer ${token}`)
          .send({ name });
        const res = await this.env.client.do(req);

        if (!isAppResponse(res)) {
          throw createFatalAPIFormat(req, res);
        }

        appId = res.data.id;
        await this.runcmd(['config', 'set', 'app_id', appId]);
        await this.runcmd(['git', 'remote']);

        this.env.log.ok(`Project linked with app ${chalk.bold(appId)}!`);
      } else {
        const opn = await import('opn');
        opn(`${config.urls.dash}/?user_token=${token}`, { wait: false });
        this.env.log.info(`Rerun ${chalk.green(`ionic link`)} to link to the new app.`);
      }
    } else {
      await this.runcmd(['config', 'set', 'app_id', appId]);

      if (config.backend === BACKEND_PRO) {
        await this.runcmd(['git', 'remote']);
      }

      this.env.log.ok(`Project linked with app ${chalk.bold(appId)}!`);
    }
  }
}
