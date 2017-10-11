import * as chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';
import { isExitCodeException } from '../../guards';
import { Ailment, Ailments, AutomaticallyTreatableAilment } from './ailments';

const ERROR_AILMENT_SKIPPED = 'AILMENT_SKIPPED';
const ERROR_AILMENT_IGNORED = 'AILMENT_IGNORED';

export class AilmentRegistry {
  protected _ailments: Ailment[] = [];

  register(ailment: Ailment) {
    this._ailments.push(ailment);
  }

  get ailments(): Ailment[] {
    return this._ailments;
  }
}

export const registry = new AilmentRegistry();

for (let Ailment of Ailments.ALL) {
  registry.register(new Ailment());
}

export async function treatAilments(env: IonicEnvironment) {
  const config = await env.config.load();
  let count = 0;

  const isLoggedIn = await env.session.isLoggedIn();

  if (!isLoggedIn) {
    env.log.warn(`For best results, please make sure you're logged in to Ionic.\nSome issues can't be detected without authentication. Run:\n\n    ${chalk.green('ionic login')}`);
  }

  env.tasks.next('Detecting issues');

  const ailments = await Promise.all(registry.ailments.map(async (ailment): Promise<[Ailment, boolean]> => {
    if (ailment.requiresAuthentication && !isLoggedIn) {
      return [ ailment, false ];
    }

    const detected = await ailment.detected(env);
    count++;
    env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${count} / ${registry.ailments.length}`)} complete`);

    return [ ailment, detected ];
  }));

  env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${registry.ailments.length} / ${registry.ailments.length}`)} complete`);

  const detectedAilments = ailments
    .filter(([ , detected ]) => detected)
    .map(([ ailment,  ]) => ailment)
    .filter(ailment => !config.state.doctor.ignored.includes(ailment.id));

  let treatedAilmentCount = 0;
  let manuallyTreatableAilmentCount = 0;

  env.tasks.end();
  env.log.info(`Detected ${chalk.bold(String(detectedAilments.length))} issue${detectedAilments.length === 1 ? '' : 's'}.${detectedAilments.length === 0 ? ' Aww yeah! 💪' : ''}`);

  for (let ailment of detectedAilments) {
    if (ailment instanceof AutomaticallyTreatableAilment) {
      try {
        await automaticallyTreatAilment(env, ailment);
        treatedAilmentCount++;
      } catch (e) {
        if (e !== ERROR_AILMENT_SKIPPED && e !== ERROR_AILMENT_IGNORED) {
          if (isExitCodeException(e)) {
            env.log.error(`Error occurred during automatic fix: ${e.message}`);
          } else {
            env.log.error(`Error occurred during automatic fix: ${e.stack ? e.stack : e}`);
          }
        }
      }
    } else {
      const treatmentSteps = await ailment.getTreatmentSteps(env);
      const stepOutput = treatmentSteps.length > 0 ? `To fix, take the following step(s):\n\n${treatmentSteps.map((step, i) => `    ${i + 1}) ${step.name}`).join('\n')}` : '';
      env.log.warn(
        `${await ailment.getMessage(env)} ${stepOutput}\n\n` +
        `Ignore this issue with: ${chalk.green(`ionic doctor ignore ${ailment.id}`)}`
      );
    }
  }

  if (treatedAilmentCount > 0) {
    env.log.ok(`Fixed ${treatedAilmentCount} issue(s)!`);
  }

  if (manuallyTreatableAilmentCount > 0) {
    env.log.info(`${manuallyTreatableAilmentCount} issues need to be manually fixed.`);
  }
}

async function automaticallyTreatAilment(env: IonicEnvironment, ailment: AutomaticallyTreatableAilment) {
  const config = await env.config.load();
  const treatmentSteps = await ailment.getTreatmentSteps(env);
  const stepOutput = treatmentSteps.map((step, i) => `    ${i + 1}) ${step.name}`).join('\n');
  env.log.warn(`${await ailment.getMessage(env)} To fix, the following step(s) need to be taken:\n\n${stepOutput}`);

  const CHOICE_YES = 'yes';
  const CHOICE_NO = 'no';
  const CHOICE_IGNORE = 'ignore';

  const choice = await env.prompt({
    type: 'list',
    name: 'choice',
    message: `Fix automatically?`,
    choices: [
      {
        name: 'Yes',
        value: CHOICE_YES,
      },
      {
        name: 'No',
        value: CHOICE_NO,
      },
      {
        name: 'Ignore forever',
        value: CHOICE_IGNORE,
      },
    ],
  });

  if (choice === CHOICE_YES) {
    env.tasks.next(`Steps`);

    for (let i in treatmentSteps) {
      const step = treatmentSteps[i];
      env.log.debug(typeof i);
      env.tasks.updateMsg(`Steps: ${chalk.bold(`${Number(i) + 1} / ${treatmentSteps.length}`)}`);
      try {
        await step.treat();
      } catch (e) {
        if (!isExitCodeException(e) || e.exitCode > 0) {
          throw e;
        }
      }
    }

    env.tasks.updateMsg(`Steps: ${chalk.bold(`${treatmentSteps.length} / ${treatmentSteps.length}`)}`);
    env.tasks.end();
  } else if (choice === CHOICE_NO) {
    throw ERROR_AILMENT_SKIPPED;
  } else if (choice === CHOICE_IGNORE) {
    config.state.doctor.ignored.push(ailment.id);
    throw ERROR_AILMENT_IGNORED;
  }
}
