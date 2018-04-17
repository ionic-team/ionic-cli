import chalk from 'chalk';
import * as Debug from 'debug';

import { IAilment, IonicEnvironment, TreatableAilment } from '../../definitions';
import { isExitCodeException, isTreatableAilment } from '../../guards';

import { formatAilmentMessage } from './ailments';

export * from './ailments';

const debug = Debug('ionic:cli-utils:lib:doctor');

export const ERROR_AILMENT_IGNORED = 'AILMENT_IGNORED';
export const ERROR_AILMENT_SKIPPED = 'AILMENT_SKIPPED';

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
      env.log.error(
        `Error while checking ${chalk.bold(ailment.id)}:\n` +
        `${chalk.red(e.stack ? e.stack : e)}`
      );
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

      if (isTreatableAilment(ailment)) {
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
  if (isTreatableAilment(ailment)) {
    try {
      const treated = await _treatAilment(env, ailment);
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
    env.log.warn(await formatAilmentMessage(ailment));
  }

  return false;
}

async function _treatAilment(env: IonicEnvironment, ailment: TreatableAilment) {
  const config = await env.config.load();
  const treatmentSteps = await ailment.getTreatmentSteps();
  env.log.warn(await formatAilmentMessage(ailment));

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
    for (const i in treatmentSteps) {
      const step = treatmentSteps[i];

      try {
        await step.treat();
      } catch (e) {
        if (!isExitCodeException(e) || e.exitCode > 0) {
          throw e;
        }
      }
    }

    return true;
  } else if (choice === CHOICE_NO) {
    throw ERROR_AILMENT_SKIPPED;
  } else if (choice === CHOICE_IGNORE) {
    config.state.doctor.ignored.push(ailment.id);
    throw ERROR_AILMENT_IGNORED;
  }

  return false;
}
