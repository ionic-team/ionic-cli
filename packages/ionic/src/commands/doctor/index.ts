import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class DoctorNamespace extends Namespace {
  name = 'doctor';
  description = 'Commands for checking the health of your Ionic project';
  longDescription = ``;

  commands = new CommandMap([
    ['check', async () => { const { DoctorCheckCommand } = await import('./check'); return new DoctorCheckCommand(); }],
    ['ignore', async () => { const { DoctorIgnoreCommand } = await import('./ignore'); return new DoctorIgnoreCommand(); }],
  ]);
}
