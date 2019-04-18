import { BaseConfig, createPromptChoiceSeparator, parseArgs } from '@ionic/cli-framework';
import { readFile, writeFile } from '@ionic/utils-fs';
import * as lodash from 'lodash';
import * as path from 'path';

import { BaseIntegration } from '../';
import {
  App,
  EnterpriseProjectIntegration,
  IntegrationAddDetails,
  IntegrationName
} from '../../../definitions';
import { isSuperAgentError } from '../../../guards';
import { strong, weak } from '../../color';
import { FatalException } from '../../errors';

interface ProductKey {
  id: number;
  key: string;
  registries: string[];
  updated: string;
  created: string;
  org: any;
  app: any;
  packages: any[];
}

const CHOICE_CREATE_NEW_APP = 'createNewApp';

export class EnterpriseIntegrationConfig extends BaseConfig<EnterpriseProjectIntegration> {

  provideDefaults(c: Partial<Readonly<EnterpriseProjectIntegration>>): EnterpriseProjectIntegration {
    return {};
  }
}

export class Integration extends BaseIntegration<EnterpriseProjectIntegration> {
  readonly name: IntegrationName = 'enterprise';
  readonly summary = 'Ionic Enterprise Edition provides premier native solutions, UI, & support for companies building cross-platform apps.';
  readonly archiveUrl = undefined;

  async enable(config?: EnterpriseProjectIntegration): Promise<void> {
    const baseConfig = config && config.root ? { root: config.root } : undefined;
    await this.updateNPMRC();
    return super.enable(baseConfig);
  }

  async add(details: IntegrationAddDetails): Promise<void> {
    let productKey = this.config.get('productKey');
    let appId = this.config.get('appId');

    if (details.enableArgs) {
      const parsedArgs = parseArgs(details.enableArgs, { string: ['app-id', 'key'] });

      appId = parsedArgs['app-id'];
      productKey = parsedArgs['key'];
    }

    if (!productKey) {
      productKey = await details.env.prompt({
        type: 'input',
        name: 'product-key',
        message: 'Please enter your product key:',
      });
    }
    const keyInfo = await this.validatePK(details, productKey, appId);

    for (const entry of lodash.entries(keyInfo)) {
      const [key, value] = entry;
      this.config.set(key as any, value);
    }

    return super.add(details);
  }

  private async validatePK(details: IntegrationAddDetails, pk: string, appId?: string): Promise<EnterpriseProjectIntegration> {
    let key = await this.getPK(details, pk);
    if (!key.org) {
      throw new FatalException('No Organization attached to key. Please contact support@ionic.io');
    }

    if (!key.app || appId) {
      if (!appId) {
        appId = await this.chooseAppToLink(details, key.org);
      }
      key = await this.registerKey(details, key, appId);
    }

    return {
      keyId: key.id,
      productKey: key.key,
      appId: key.app.id,
      orgId: key.org.id,
      registries: key.registries,
    };
  }

  private async chooseAppToLink(details: IntegrationAddDetails, org: any): Promise<string> {
    const appClient = await this.getAppClient(details);
    const paginator = appClient.paginate({}, org.id);
    const apps: App[] = [];

    for (const r of paginator) {
      const res = await r;
      apps.push(...res.data);
    }

    let appId = await this.chooseApp(details, apps, org);
    if (appId === CHOICE_CREATE_NEW_APP) {
      appId = await this.createNewApp(details, org);
    }

    return appId;
  }

  private async registerKey(details: IntegrationAddDetails, key: ProductKey, appId: string) {
    const token = details.env.session.getUserToken();
    const { req } = await details.env.client.make('PATCH', `/orgs/${key.org.id}/keys/${key.id}`);
    req.set('Authorization', `Bearer ${token}`);
    req.send({ app_id: appId });

    try {
      const res = await details.env.client.do(req);
      return res.data as ProductKey;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401 || e.response.status === 403) {
          throw new FatalException('Authorization Failed. Make sure you\'re logged into the correct account with access to the key. Try logging out and back in again.');
        }
        const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
        throw new FatalException(`Unable to Register Key: ` + apiErrorMessage);
      } else {
        throw e;
      }
    }
  }

  private async getAppClient(details: IntegrationAddDetails) {
    const { AppClient } = await import('../../../lib/app');
    const token = details.env.session.getUserToken();
    return new AppClient(token, details.env);
  }

  private async createNewApp(details: IntegrationAddDetails, org: any): Promise<string> {
    const appName = await details.env.prompt({
      type: 'input',
      name: 'appName',
      message: 'Please enter the name of your app:',
    });

    const appClient = await this.getAppClient(details);
    const newApp = await appClient.create({ org_id: org.id, name: appName });

    return newApp.id;
  }

  private async chooseApp(details: IntegrationAddDetails, apps: App[], org: any): Promise<string> {
    const { formatName } = await import('../../../lib/app');

    const newAppChoice = {
      name: strong('Create A New App'),
      id: CHOICE_CREATE_NEW_APP,
      value: CHOICE_CREATE_NEW_APP,
      org,
    };

    const linkedApp = await details.env.prompt({
      type: 'list',
      name: 'linkedApp',
      message: 'This key needs to be registered to an app. Which app would you like to register it to?',
      choices: [
        ...apps.map(app => ({
          name: `${formatName(app)} ${weak(`(${app.id})`)}`,
          value: app.id,
        })),
        createPromptChoiceSeparator(),
        newAppChoice,
        createPromptChoiceSeparator(),
      ],
    });

    return linkedApp;
  }

  private async getPK(details: IntegrationAddDetails, pk: string): Promise<ProductKey> {
    const token = details.env.session.getUserToken();
    const { req } = await details.env.client.make('GET', '/keys/self');
    req.set('Authorization', `Bearer ${token}`).set('Product-Key-ID', pk);

    try {
      const res = await details.env.client.do(req);
      return res.data as ProductKey;
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 401 || e.response.status === 403) {
          throw new FatalException('Authorization Failed. Make sure you\'re logged into the correct account with access to the key. Try logging out and back in again.');
        }
        if (e.response.status === 404) {
          throw new FatalException('Invalid Product Key');
        }
        const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
        throw new FatalException(`Unable to Add Integration: ` + apiErrorMessage);
      } else {
        throw e;
      }
    }
  }

  private async updateNPMRC() {
    const pk = this.config.get('productKey');
    const registries = this.config.get('registries');
    if (!pk || !registries) {
      throw new FatalException('Enterprise config invalid');
    }
    let npmrc = '';
    try {
      npmrc = await readFile(path.join(this.e.project.directory , '.npmrc'), 'utf8');
    } catch (e) {
      if (!e.message.includes('ENOENT')) {
        throw e;
      }
    }

    for (const entry of registries) {
      const [scope, url] = entry.split(';');
      const urlNoProt = url.split(':').splice(1).join(':');
      const scopeRegex = new RegExp(`${scope}:registry.*\\n?`, 'g');
      const urlRegex = new RegExp(`${urlNoProt}:_authToken.*\\n?`, 'g');
      const newScope = `${scope}:registry=${url}\n`;
      const newUrl = `${urlNoProt}:_authToken=${pk}\n`;

      if (npmrc.match(scopeRegex)) {
        npmrc = npmrc.replace(scopeRegex, newScope);
      } else {
        npmrc += newScope;
      }

      if (npmrc.match(urlRegex)) {
        npmrc = npmrc.replace(urlRegex, newUrl);
      } else {
        npmrc += newUrl;
      }
    }
    await writeFile(path.join(this.e.project.directory, `.npmrc`), npmrc, { encoding: 'utf8' });
  }

  get config(): EnterpriseIntegrationConfig {
    return new EnterpriseIntegrationConfig(this.e.project.filePath, { pathPrefix: ['integrations', this.name] });
  }
}
