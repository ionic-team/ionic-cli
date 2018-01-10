import chalk from 'chalk';

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

  get(id: string) {
    return this._ailments.find(a => a.id === id);
  }
}

let _registry: AilmentRegistry | undefined = undefined;

export async function getRegistry(env: IonicEnvironment) {
  if (!_registry) {
    _registry = new AilmentRegistry();

    for (const Ailment of Ailments.ALL) {
      _registry.register(new Ailment(env));
    }
  }

  return _registry;
}

export async function treatAilments(env: IonicEnvironment) {
  const registry = await getRegistry(env);
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

    let detected = false;

    try {
      detected = await ailment.detected();
    } catch (e) {
      env.log.debug(() => `Error while checking ${chalk.bold(ailment.id)}:\n\n${chalk.red(e.stack ? e.stack : e)}`);
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

      if (ailment instanceof AutomaticallyTreatableAilment) {
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

export async function detectAndTreatAilment(env: IonicEnvironment, ailment: Ailment) {
  const detected = await ailment.detected();

  if (detected) {
    await treatAilment(env, ailment);
  } else {
    env.log.ok(`All good! ${chalk.green(ailment.id)} not detected.`);
  }
}

async function treatAilment(env: IonicEnvironment, ailment: Ailment): Promise<boolean> {
  if (ailment instanceof AutomaticallyTreatableAilment) {
    try {
      const treated = await automaticallyTreatAilment(env, ailment);
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
    const stepOutput = treatmentSteps.length > 0 ? `To fix, take the following step(s):\n\n${treatmentSteps.map((step, i) => `    ${i + 1}) ${step.name}`).join('\n')}` : '';
    env.log.warn(
      `${await ailment.getMessage()} ${stepOutput}\n\n` +
      `Ignore this issue with: ${chalk.green(`ionic doctor ignore ${ailment.id}`)}`
    );
  }

  return false;
}

async function automaticallyTreatAilment(env: IonicEnvironment, ailment: AutomaticallyTreatableAilment): Promise<boolean> {
  const config = await env.config.load();
  const treatmentSteps = await ailment.getTreatmentSteps();
  const stepOutput = treatmentSteps.map((step, i) => `    ${i + 1}) ${step.name}`).join('\n');
  env.log.warn(`${await ailment.getMessage()} To fix, the following step(s) need to be taken:\n\n${stepOutput}`);

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
    // env.tasks.next(`Steps`);

    for (const i in treatmentSteps) {
      const step = treatmentSteps[i];
      env.log.debug(typeof i);
      // env.tasks.updateMsg(`Steps: ${chalk.bold(`${Number(i) + 1} / ${treatmentSteps.length}`)}`);
      try {
        await step.treat();
      } catch (e) {
        if (!isExitCodeException(e) || e.exitCode > 0) {
          throw e;
        }
      }
    }

    // env.tasks.updateMsg(`Steps: ${chalk.bold(`${treatmentSteps.length} / ${treatmentSteps.length}`)}`);
    // env.tasks.end();

    return true;
  } else if (choice === CHOICE_NO) {
    throw ERROR_AILMENT_SKIPPED;
  } else if (choice === CHOICE_IGNORE) {
    config.state.doctor.ignored.push(ailment.id);
    throw ERROR_AILMENT_IGNORED;
  }

  return false;
}
