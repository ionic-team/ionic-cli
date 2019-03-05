// import * as Debug from 'debug';

import {BaseIntegration} from '../';
import {
  EnterpriseProjectIntegration,
  IntegrationAddDetails,
  IntegrationName
} from '../../../definitions';
import {BaseConfig} from "@ionic/cli-framework";

// const debug = Debug('ionic:lib:integrations:enterprise');

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
    const baseConfig = config && config.root ? {root: config.root} : undefined;
    return super.enable(baseConfig);
  }

  async add(details: IntegrationAddDetails): Promise<void> {
    let productKey = this.config.get('productKey');
    if (details.enableArgs && details.enableArgs[0]) {
      productKey = details.enableArgs[0];
    }

    if (!productKey) {
      productKey = await details.env.prompt({
        type: 'input',
        name: 'product-key',
        message: 'Please enter your product key'
      });
    }
    this.config.set('productKey', productKey);

    return super.add(details);
  }

  get config(): EnterpriseIntegrationConfig {
    return new EnterpriseIntegrationConfig(this.e.project.filePath, {pathPrefix: ['integrations', this.name]});
  }
}
