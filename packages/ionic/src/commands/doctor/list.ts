import chalk from 'chalk';

import { columnar } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, isTreatableAilment } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class DoctorListCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'list',
      type: 'project',
      summary: 'List all issues and their identifiers',
      description: `
If an issue is marked as ${chalk.bold('treatable')}, then ${chalk.green('ionic doctor treat')} can attempt to fix it. Issues marked as ${chalk.bold('ignored')} will not be detected in either ${chalk.green('ionic doctor check')} or ${chalk.green('ionic doctor treat')}.

You can flip whether an issue is ignored or not by using ${chalk.green('ionic config set -g doctor.issues.<issue-id>.ignored true/false')}, where ${chalk.green('<issue-id>')} matches an ID listed with this command.
      `,
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const registry = await this.env.project.getAilmentRegistry(this.env);
    const config = await this.env.config.load();

    const rows = await Promise.all(registry.ailments.map(async ailment => {
      const issueConfig = config.doctor.issues[ailment.id];
      const ignored = issueConfig && issueConfig.ignored;

      const meta: string[] = [];

      if (ignored) {
        meta.push(chalk.red('ignored'));
      }

      if (isTreatableAilment(ailment)) {
        meta.push('treatable');
      }

      return [
        chalk.green(ailment.id),
        meta.join(', '),
      ];
    }));

    rows.sort((row1, row2) => strcmp(row1[0], row2[0]));

    this.env.log.rawmsg(columnar(rows, { headers: ['id', 'meta'] }));
  }
}
