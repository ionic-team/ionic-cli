import chalk from 'chalk';
import * as lodash from 'lodash';

import { columnar } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, InfoItem, InfoItemGroup } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class InfoCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'info',
      type: 'global',
      summary: 'Print system/environment info',
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
      const task = this.env.tasks.next('Gathering environment info');
      const results = await this.env.getInfo();

      const groups: InfoItemGroup[] = ['ionic', 'capacitor', 'cordova', 'system', 'environment'];
      const groupedInfo: Map<InfoItemGroup, InfoItem[]> = new Map(groups.map((group): [typeof group, InfoItem[]] => [group, results.filter(item => item.group === group)]));

      const sortInfo = (a: InfoItem, b: InfoItem): number => {
        if (a.key[0] === '@' && b.key[0] !== '@') {
          return 1;
        }

        if (a.key[0] !== '@' && b.key[0] === '@') {
          return -1;
        }

        return strcmp(a.key.toLowerCase(), b.key.toLowerCase());
      };

      const projectPath = this.env.project.directory;

      const splitInfo = (ary: InfoItem[]) => ary
        .sort(sortInfo)
        .map((item): [string, string] => [`   ${item.key}${item.flair ? ' ' + chalk.dim('(' + item.flair + ')') : ''}`, chalk.dim(item.value) + (item.path && projectPath && !item.path.startsWith(projectPath) ? ` ${chalk.dim('(' + item.path + ')')}` : '')]);

      const format = (details: [string, string][]) => columnar(details, { vsep: ':' });

      task.end();

      if (!projectPath) {
        this.env.log.warn('You are not in an Ionic project directory. Project context may be missing.');
      }

      this.env.log.nl();

      for (const [ group, info ] of groupedInfo.entries()) {
        if (info.length > 0) {
          this.env.log.rawmsg(`${chalk.bold(lodash.startCase(group))}\n\n`);
          this.env.log.rawmsg(`${format(splitInfo(info))}\n\n`);
        }
      }
    }
  }
}
