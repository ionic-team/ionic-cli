import chalk from 'chalk';
import * as Debug from 'debug';

import { IAilment, IonicEnvironment } from '../../definitions';
import { isAutomaticallyTreatableAilment, isExitCodeException } from '../../guards';
import { ERROR_AILMENT_IGNORED, ERROR_AILMENT_SKIPPED } from './ailments';

export * from './ailments';

const debug = Debug('ionic:cli-utils:lib:doctor');

export async function treatAilments(env: IonicEnvironment) {
  const registry = await env.project.getAilmentRegistry(env);
  const config = await env.config.load();
  let count = 0;

  const isLoggedIn = await env.session.isLoggedIn();

  if (!isLoggedIn) {
    env.log.warn(`For best results, please make sure you're logged in to Ionic.\nSome issues can't be detected without authentication. Run:\n\n    ${chalk.green('ionic login')}`);
  }

  env.tasks.next('Detecting issues');

  const ailments = await Promise.all(registry.ailments.map(async (ailment): Promise<[IAilment, boolean]> => {
    let detected = false;

    try {
      debug(`Detecting ${chalk.bold(ailment.id)}`);
      detected = await ailment.detected();
    } catch (e) {
      env.log.error(`Error while checking ${chalk.bold(ailment.id)}:\n\n${chalk.red(e.stack ? e.stack : e)}`);
    }

    count++;
    env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${count} / ${registry.ailments.length}`)} complete`);

    return [ ailment, detected ];
  }));

  env.tasks.updateMsg(`Detecting issues: ${chalk.bold(`${registry.ailments.length} / ${registry.ailments.length}`)} complete`);

  const detectedAilments = ailments
    .filter(([ , detected ]) => detected)
    .map(([ ailment ]) => ailment)
    .filter(ailment => !config.state.doctor.ignored.includes(ailment.id));

  let treatedAilmentCount = 0;
  let manuallyTreatableAilmentCount = 0;

  env.tasks.end();
  const fn = detectedAilments.length > 0 ? env.log.info.bind(env.log) : env.log.ok.bind(env.log);
  fn(`Detected ${chalk.bold(String(detectedAilments.length))} issue${detectedAilments.length === 1 ? '' : 's'}.${detectedAilments.length === 0 ? ' Aww yeah! 💪' : ''}`);

  if (detectedAilments.length > 0) {
    for (const ailment of detectedAilments) {
      const treated = await treatAilment(env, ailment);

      if (isAutomaticallyTreatableAilment(ailment)) {
        if (treated) {
          treatedAilmentCount++;
        }
      } else {
        manuallyTreatableAilmentCount++;
      }
    }

    if (treatedAilmentCount > 0) {
      const fn = manuallyTreatableAilmentCount > 0 ? env.log.info.bind(env.log) : env.log.ok.bind(env.log);
      fn(`Fixed ${treatedAilmentCount} issue${treatedAilmentCount === 1 ? '' : 's'}!`);
    }

    if (manuallyTreatableAilmentCount > 0) {
      env.log.msg(`${manuallyTreatableAilmentCount} ${manuallyTreatableAilmentCount === 1 ? 'issue needs' : 'issues need'} to be fixed manually.`);
    }
  }
}

export async function detectAndTreatAilment(env: IonicEnvironment, ailment: IAilment) {
  const detected = await ailment.detected();

  if (detected) {
    await treatAilment(env, ailment);
  } else {
    env.log.ok(`All good! ${chalk.green(ailment.id)} not detected.`);
  }
}

async function treatAilment(env: IonicEnvironment, ailment: IAilment): Promise<boolean> {
  if (isAutomaticallyTreatableAilment(ailment)) {
    try {
      const treated = await ailment.treat();
      return treated;
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
    const treatmentSteps = await ailment.getTreatmentSteps();
    const stepOutput = treatmentSteps.length > 0 ? `\n\nTo fix, take the following step(s):\n\n${treatmentSteps.map((step, i) => `    ${i + 1}) ${step.name}`).join('\n')}` : '';
    env.log.warn(
      `${await ailment.getMessage()} ${stepOutput}\n\n` +
      `Ignore this issue with: ${chalk.green(`ionic doctor ignore ${ailment.id}`)}`
    );
  }

  return false;
}
