import chalk from 'chalk';

import { DoctorTreatmentStep, IAilment, PatientTreatmentStep } from '../../../definitions';
import { isDoctorTreatmentStep } from '../../../guards';

export async function formatAilmentMessage(ailment: IAilment): Promise<string> {
  return (
    `${await ailment.getMessage()}\n` +
    `${formatSteps(await ailment.getTreatmentSteps())}\n\n` +
    `Ignore this issue with: ${chalk.green(`ionic doctor ignore ${ailment.id}`)}`
  );
}

export function formatSteps(steps: (DoctorTreatmentStep | PatientTreatmentStep)[]): string {
  if (steps.length === 0) {
    return '';
  }

  const treatable = isDoctorTreatmentStep(steps[0]);
  const msg = treatable ? `To fix, the following step(s) need to be taken:` : `To fix, take the following step(s):`;

  return `\n${msg}\n\n${steps.map((step, i) => `    ${i + 1}) ${step.message}`).join('\n')}`;
}
