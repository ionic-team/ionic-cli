import chalk from 'chalk';
import * as Debug from 'debug';

import { IAilment, IAilmentRegistry, TreatableAilment, isTreatableAilment } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

const debug = Debug('ionic:cli:commands:doctor:base');

export abstract class DoctorCommand extends Command {
  private _registry?: IAilmentRegistry;

  async getRegistry(): Promise<IAilmentRegistry> {
    if (!this._registry) {
      this._registry = await this.env.project.getAilmentRegistry(this.env);
    }

    return this._registry;
  }

  async detectAilments(): Promise<IAilment[]> {
    const registry = await this.getRegistry();
    const config = await this.env.config.load();
    let count = 0;

    const isLoggedIn = await this.env.session.isLoggedIn();

    if (!isLoggedIn) {
      this.env.log.warn(`For best results, please make sure you're logged in to Ionic.\nSome issues can't be detected without authentication. Run:\n\n    ${chalk.green('ionic login')}`);
    }

    this.env.tasks.next('Detecting issues');

    const ailments = await Promise.all(registry.ailments.map(async (ailment): Promise<[IAilment, boolean]> => {
      let detected = false;

      try {
        debug(`Detecting ${chalk.bold(ailment.id)}`);
        detected = await ailment.detected();
      } catch (e) {
        this.env.log.error(
          `Error while checking ${chalk.bold(ailment.id)}:\n` +
          `${chalk.red(e.stack ? e.stack : e)}`
        );
      }

      count++;
      this.env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${count} / ${registry.ailments.length}`)} complete`);

      return [ ailment, detected ];
    }));

    this.env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${registry.ailments.length} / ${registry.ailments.length}`)} complete`);

    const detectedAilments = ailments
      .filter(([ , detected ]) => detected)
      .map(([ ailment ]) => ailment)
      .filter(ailment => {
        const issueConfig = config.doctor.issues[ailment.id];

        if (issueConfig && issueConfig.ignored === true) {
          return false;
        }

        return true;
      });

    this.env.tasks.end();

    return detectedAilments;
  }

  async detectTreatableAilments(): Promise<TreatableAilment[]> {
    const ailments = await this.detectAilments();

    return ailments.filter((ailment): ailment is TreatableAilment => isTreatableAilment(ailment));
  }
}
