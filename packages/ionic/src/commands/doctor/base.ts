import chalk from 'chalk';
import * as Debug from 'debug';

import { concurrentFilter } from '@ionic/cli-framework/utils/array';

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

    const ailments = registry.ailments.filter(ailment => {
      const issueConfig = config.doctor.issues[ailment.id];

      if (issueConfig && issueConfig.ignored === true) {
        debug('Issue %s ignored by config', ailment.id);
        return false;
      }

      return true;
    });

    const detectedAilments = await concurrentFilter(ailments, async (ailment): Promise<boolean> => {
      let detected = false;

      try {
        detected = await ailment.detected();
        debug('Detected %s: %s', ailment.id, detected);
      } catch (e) {
        this.env.log.error(
          `Error while checking ${chalk.bold(ailment.id)}:\n` +
          `${chalk.red(e.stack ? e.stack : e)}`
        );
      }

      count++;
      this.env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${count} / ${ailments.length}`)} complete`);

      return detected;
    });

    this.env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${ailments.length} / ${ailments.length}`)} complete`);
    this.env.tasks.end();

    return detectedAilments;
  }

  async detectTreatableAilments(): Promise<TreatableAilment[]> {
    const ailments = await this.detectAilments();

    return ailments.filter((ailment): ailment is TreatableAilment => isTreatableAilment(ailment));
  }
}
