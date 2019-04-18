import { concurrentFilter } from '@ionic/utils-array';
import * as Debug from 'debug';

import { IAilment, IAilmentRegistry, TreatableAilment } from '../../definitions';
import { isTreatableAilment } from '../../guards';
import { failure, input, strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

const debug = Debug('ionic:commands:doctor:base');

export abstract class DoctorCommand extends Command {
  async getRegistry(): Promise<IAilmentRegistry> {
    if (!this.project) {
      throw new FatalException(`Cannot use ${input('ionic doctor')} outside a project directory.`);
    }

    const { AilmentRegistry } = await import('../../lib/doctor');

    const registry = new AilmentRegistry();
    await this.project.registerAilments(registry);

    return registry;
  }

  async detectAilments(): Promise<IAilment[]> {
    const registry = await this.getRegistry();
    let count = 0;

    const tasks = this.createTaskChain();
    const isLoggedIn = this.env.session.isLoggedIn();

    if (!isLoggedIn) {
      this.env.log.warn(`For best results, please make sure you're logged in to Ionic.\nSome issues can't be detected without authentication. Run:\n\n    ${input('ionic login')}`);
    }

    const detectTask = tasks.next('Detecting issues');

    const ailments = registry.ailments.filter(ailment => {
      if (this.env.config.get(`doctor.issues.${ailment.id}.ignored` as any)) {
        debug('Issue %s ignored by config', ailment.id);
        return false;
      }

      if (!ailment.implicit) {
        debug('Issue %s will not be implicitly detected', ailment.id);
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
          `Error while checking ${strong(ailment.id)}:\n` +
          `${failure(e.stack ? e.stack : e)}`
        );
      }

      count++;
      detectTask.msg = `Detecting issues: ${strong(`${count} / ${ailments.length}`)} complete`;

      return detected;
    });

    detectTask.msg = `Detecting issues: ${strong(`${ailments.length} / ${ailments.length}`)} complete`;
    tasks.end();

    return detectedAilments;
  }

  async detectTreatableAilments(): Promise<TreatableAilment[]> {
    const ailments = await this.detectAilments();

    return ailments.filter((ailment): ailment is TreatableAilment => isTreatableAilment(ailment));
  }
}
