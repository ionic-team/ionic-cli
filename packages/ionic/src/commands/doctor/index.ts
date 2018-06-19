import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class DoctorNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'doctor',
      summary: 'Commands for checking the health of your Ionic project',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['check', async () => { const { DoctorCheckCommand } = await import('./check'); return new DoctorCheckCommand(this, this.env, this.project); }],
      ['treat', async () => { const { DoctorTreatCommand } = await import('./treat'); return new DoctorTreatCommand(this, this.env, this.project); }],
      ['list', async () => { const { DoctorListCommand } = await import('./list'); return new DoctorListCommand(this, this.env, this.project); }],
      ['ls', 'list'],
      ['checkup', 'check'],
      ['validate', 'check'],
      ['fix', 'treat'],
    ]);
  }
}
