import { columnar } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';
import * as lodash from 'lodash';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, InfoItem, InfoItemGroup } from '../definitions';
import { input, strong, weak } from '../lib/color';
import { Command } from '../lib/command';

const INFO_GROUPS: ReadonlyArray<InfoItemGroup> = ['ionic', 'capacitor', 'cordova', 'system', 'environment'];

export class InfoCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'info',
      type: 'global',
      summary: 'Print project, system, and environment information',
      description: `
This command is an easy way to share information about your setup. If applicable, be sure to run ${input('ionic info')} within your project directory to display even more information.
      `,
      options: [
        {
          name: 'json',
          summary: 'Print system/environment info in JSON format',
          type: Boolean,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { json } = options;

    if (json) {
      process.stdout.write(JSON.stringify(await this.env.getInfo()));
    } else {
      const results = await this.env.getInfo();

      const groupedInfo: Map<InfoItemGroup, InfoItem[]> = new Map(
        INFO_GROUPS.map((group): [typeof group, InfoItem[]] => [group, results.filter(item => item.group === group)])
      );

      const sortInfo = (a: InfoItem, b: InfoItem): number => {
        if (a.key[0] === '@' && b.key[0] !== '@') {
          return 1;
        }

        if (a.key[0] !== '@' && b.key[0] === '@') {
          return -1;
        }

        return strcmp(a.key.toLowerCase(), b.key.toLowerCase());
      };

      const projectPath = this.project && this.project.directory;

      const splitInfo = (ary: InfoItem[]) => ary
        .sort(sortInfo)
        .map((item): [string, string] => [`   ${item.key}${item.flair ? ' ' + weak('(' + item.flair + ')') : ''}`, weak(item.value) + (item.path && projectPath && !item.path.startsWith(projectPath) ? ` ${weak('(' + item.path + ')')}` : '')]);

      const format = (details: [string, string][]) => columnar(details, { vsep: ':' });

      if (!projectPath) {
        this.env.log.warn('You are not in an Ionic project directory. Project context may be missing.');
      }

      this.env.log.nl();

      for (const [ group, info ] of groupedInfo.entries()) {
        if (info.length > 0) {
          this.env.log.rawmsg(`${strong(`${lodash.startCase(group)}:`)}\n\n`);
          this.env.log.rawmsg(`${format(splitInfo(info))}\n\n`);
        }
      }
    }
  }
}
