import { CommandMap, Namespace } from '../../lib/namespace';

export class DoctorNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'doctor',
      summary: 'Commands for checking the health of your Ionic project',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['check', async () => { const { DoctorCheckCommand } = await import('./check'); return new DoctorCheckCommand(this); }],
      ['treat', async () => { const { DoctorTreatCommand } = await import('./treat'); return new DoctorTreatCommand(this); }],
      ['list', async () => { const { DoctorListCommand } = await import('./list'); return new DoctorListCommand(this); }],
      ['ls', 'list'],
      ['checkup', 'check'],
      ['validate', 'check'],
      ['fix', 'treat'],
    ]);
  }
}
