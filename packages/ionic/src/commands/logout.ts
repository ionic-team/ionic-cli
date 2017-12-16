import { BACKEND_LEGACY, BACKEND_PRO, CommandData, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class LogoutCommand extends Command {
  metadata: CommandData = {
    name: 'logout',
    type: 'global',
    backends: [BACKEND_LEGACY, BACKEND_PRO],
    description: '',
    visible: false,
  };

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!(await this.env.session.isLoggedIn())) {
      this.env.log.info('You are already logged out.');
      return;
    }

    await this.env.session.logout();
    this.env.log.ok('You are logged out.');
  }
}
