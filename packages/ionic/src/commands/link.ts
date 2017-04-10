import * as chalk from 'chalk';

import {
  APIResponse,
  APIResponseSuccess,
  AppDetails,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain,
  createFatalAPIFormat,
  isAPIResponseSuccess,
  isAppResponse,
  isAppsResponse,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

const CREATE_NEW_APP_CHOICE = 'createNewApp';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'link',
  description: 'Links your app with Ionic Cloud.',
  exampleCommands: [''],
  inputs: [
    {
      name: 'app_id',
      description: 'The Ionic Cloud app id that you would like to link to.'
    }
  ],
  requiresProject: true
})
export class LinkCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ appId ] = inputs;

    const config = await this.env.config.load();
    const project = await this.env.project.load();
    const tasks = new TaskChain();

    if (appId) {
      tasks.next(`Looking up app ${chalk.bold(appId)}`);

      if (appId === project.app_id) {
        return this.env.log.ok(`Already linked with app ${chalk.bold(appId)}.`);
      }

      const token = await this.env.session.getAppUserToken(appId);
      const req = this.env.client.make('GET', `/apps/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      const res = await this.env.client.do(req);

      if (!isAppResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      tasks.end();

      if (project.app_id) {
        const inquirer = load('inquirer');
        const confirmation = await inquirer.prompt({
          type: 'confirm',
          name: 'apply',
          message: `App ID ${chalk.green(project.app_id)} exists in project config. Overwrite?`
        });

        if (!confirmation['apply']) {
          return;
        }
      }

    } else {
      tasks.next(`Looking up your apps`);

      const token = await this.env.session.getUserToken();
      const req = this.env.client.make('GET', `/apps`)
        .set('Authorization', `Bearer ${token}`);

      let apps: AppDetails[] = [];

      for (let r of this.env.client.paginate(req, isAppsResponse)) {
        const res = await r;
        apps = apps.concat(res.data);
      }

      tasks.end();

      const createAppChoice = {
        name: 'Create a new app',
        id: CREATE_NEW_APP_CHOICE,
      };

      const inquirer = load('inquirer');
      const confirmation = await inquirer.prompt({
        type: 'list',
        name: 'choice',
        message: `Which app would you like to link`,
        choices: [createAppChoice, ...apps].map((app) => ({
          name: app.id !== CREATE_NEW_APP_CHOICE ? `${app.name} (${app.id})` : chalk.bold(app.name),
          value: app.id
        }))
      });

      appId = confirmation['choice'];
    }

    if (appId === CREATE_NEW_APP_CHOICE) {
      const token = await this.env.session.getUserToken();
      const opn = load('opn');
      opn(`${config.urls.dash}/?user_token=${token}`, { wait: false });
      this.env.log.ok(`Rerun ${chalk.green(`ionic link`)} to link to the new app.`);

    } else {
      project.app_id = appId;
      await this.env.project.save(project);

      this.env.log.ok(`Project linked with app ${chalk.bold(appId)}!`);
    }
  }
}
