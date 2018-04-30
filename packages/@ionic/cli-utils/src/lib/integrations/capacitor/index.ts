import { IIntegrationAddOptions, IntegrationName } from '../../../definitions';
import { BaseIntegration } from '../';

export class Integration extends BaseIntegration {
  readonly name: IntegrationName = 'capacitor';
  readonly summary = `Target native iOS and Android with Capacitor, Ionic's new native layer`;
  readonly archiveUrl = undefined;

  async add(options?: IIntegrationAddOptions): Promise<void> {
    await super.add(options);
  }
}
