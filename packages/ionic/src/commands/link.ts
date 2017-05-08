import * as chalk from 'chalk';

import {
  AppDetails,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  createFatalAPIFormat,
  isAppResponse,
  isAppsResponse,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

const CREATE_NEW_APP_CHOICE = 'createNewApp';

@CommandMetadata({
  name: 'link',
  type: 'project',
  description: 'Connect your local app to Ionic',
  exampleCommands: ['', 'a1b2c3d4'],
  inputs: [
    {
      name: 'app_id',
      description: `The ID of the app to link (e.g. ${chalk.green('a1b2c3d4')})`
    }
  ],
})
export class LinkCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ appId ] = inputs;

    const config = await this.env.config.load();
    const project = await this.env.project.load();

    if (project.app_id) {
      const confirmation = await this.env.prompt({
        type: 'confirm',
        name: 'apply',
        message: `App ID ${chalk.green(project.app_id)} already exists in project config. Would you like to link a different app?`
      });

      if (!confirmation['apply']) {
        return;
      }
    }

    if (appId) {
      this.env.tasks.next(`Looking up app ${chalk.bold(appId)}`);

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

      this.env.tasks.end();

    } else {
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

      const confirmation = await this.env.prompt({
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
