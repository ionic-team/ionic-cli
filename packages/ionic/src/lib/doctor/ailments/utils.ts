import chalk from 'chalk';

import { IAilment } from '../../../definitions';
import { isTreatableAilment } from '../../../guards';

export async function formatAilmentMessage(ailment: IAilment): Promise<string> {
  const treatable = isTreatableAilment(ailment);

  return (
    `${await ailment.getMessage()}\n` +
    `${await formatAilmentSteps(ailment)}\n\n` +
    `${chalk.dim('$')} ${chalk.green(`ionic config set -g doctor.issues.${ailment.id}.ignored true`)} ${chalk.dim('(ignore this issue in the future)')}\n` +
    `${treatable ? `${chalk.dim('$')} ${chalk.green(`ionic doctor treat ${ailment.id}`)} ${chalk.dim('(attempt to fix this issue)')}\n` : ''}`
  );
}

async function formatAilmentSteps(ailment: IAilment): Promise<string> {
  const steps = await ailment.getTreatmentSteps();

  if (steps.length === 0) {
    return '';
  }

  const treatable = isTreatableAilment(ailment);
  const msg = treatable ? `To fix, the following step(s) need to be taken:` : `To fix, take the following step(s):`;

  return `\n${msg}\n\n${steps.map((step, i) => ` ${chalk.dim(String(i + 1) + ')')} ${step.message}`).join('\n')}`;
}
