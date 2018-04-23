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
Issues can have various tags:
- ${chalk.bold('treatable')}: ${chalk.green('ionic doctor treat')} can attempt to fix the issue
- ${chalk.bold('ignored')}: configured not to be detected in ${chalk.green('ionic doctor check')} or ${chalk.green('ionic doctor treat')}
- ${chalk.bold('explicit-detection')}: issue is only detected explicitly with ${chalk.green('ionic doctor check <issue-id>')}

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

      const tags: string[] = [];

      if (ignored) {
        tags.push('ignored');
      }

      if (isTreatableAilment(ailment)) {
        tags.push('treatable');
      }

      if (!ailment.implicit) {
        tags.push('explicit-detection');
      }

      return [
        chalk.green(ailment.id),
        ailment.projects ? ailment.projects.map(t => chalk.bold(t)).join(', ') : 'all',
        tags.map(t => chalk.bold(t)).join(', '),
      ];
    }));

    rows.sort((row1, row2) => strcmp(row1[0], row2[0]));

    this.env.log.rawmsg(columnar(rows, { headers: ['id', 'affected projects', 'tags'] }));
  }
}
