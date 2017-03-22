import * as chalk from 'chalk';
import * as opn from 'opn';

import {
  APIResponse,
  APIResponseSuccess,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  createFatalAPIFormat,
  isAPIResponseSuccess
} from '@ionic/cli-utils';

interface App {
  name: string;
  id: string;
}

interface AppResponse extends APIResponseSuccess {
  data: App;
}

interface AppsResponse extends APIResponseSuccess {
  data: App[];
}

function isApp(app: any): app is App {
  return app
    && typeof app.name === 'string'
    && typeof app.id === 'string';
}

function isAppResponse(r: APIResponse): r is AppResponse {
  let res: AppResponse = <AppResponse>r;
  return isAPIResponseSuccess(res) && isApp(res.data);
}

function isAppsResponse(r: APIResponse): r is AppsResponse {
  let res: AppsResponse = <AppsResponse>r;
  if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
    return false;
  }

  if (res.data.length > 0) {
    return isApp(res.data[0]);
  }

  return true;
}

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
    const project = await this.env.project.load();
    let [appId] = inputs;

    if (appId) {
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

      if (project.app_id) {
        const confirmation = await this.env.inquirer.prompt({
          type: 'confirm',
          name: 'apply',
          message: `App ID ${chalk.green(project.app_id)} exists in project config. Overwrite?`
        });

        if (!confirmation['apply']) {
          return;
        }
      }

    } else {
      const token = await this.env.session.getUserToken();
      const req = this.env.client.make('GET', `/apps`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      const res = await this.env.client.do(req);

      if (!isAppsResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      const apps = res.data.filter((app) => app.id !== project.app_id);
      const createAppChoice = {
        name: 'Create a new app',
        id: CREATE_NEW_APP_CHOICE,
      };

      const confirmation = await this.env.inquirer.prompt({
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
      opn(`https://apps.ionic.io/?user_token=${token}`, { wait: false });
      this.env.log.ok(`Rerun ${chalk.green(`ionic link`)} to link to the new app.`);

    } else {
      project.app_id = appId;
      await this.env.project.save(project);

      this.env.log.ok(`Project linked with app ${chalk.bold(appId)}!`);
    }
  }
}
