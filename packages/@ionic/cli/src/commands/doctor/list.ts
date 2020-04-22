import { columnar } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { isTreatableAilment } from '../../guards';
import { input, strong } from '../../lib/color';

import { DoctorCommand } from './base';

export class DoctorListCommand extends DoctorCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'list',
      type: 'project',
      summary: 'List all issues and their identifiers',
      description: `
Issues can have various tags:
- ${strong('treatable')}: ${input('ionic doctor treat')} can attempt to fix the issue
- ${strong('ignored')}: configured not to be detected in ${input('ionic doctor check')} or ${input('ionic doctor treat')}
- ${strong('explicit-detection')}: issue is only detected explicitly with ${input('ionic doctor check <issue-id>')}

You can flip whether an issue is ignored or not by using ${input('ionic config set -g doctor.issues.<issue-id>.ignored true/false')}, where ${input('<issue-id>')} matches an ID listed with this command.
      `,
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const registry = await this.getRegistry();

    const rows = registry.ailments.map(ailment => {
      const tags: string[] = [];
      const ignored = this.env.config.get(`doctor.issues.${ailment.id}.ignored` as any);

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
        input(ailment.id),
        ailment.projects ? ailment.projects.map(t => strong(t)).join(', ') : 'all',
        tags.map(t => strong(t)).join(', '),
      ];
    });

    rows.sort((row1, row2) => strcmp(row1[0], row2[0]));

    this.env.log.rawmsg(columnar(rows, { headers: ['id', 'affected projects', 'tags'] }));
  }
}
