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

      const groups: InfoItemGroup[] = ['cli-packages', 'global-packages', 'local-packages', 'system', 'environment'];
      const groupedInfo: Map<InfoItemGroup, InfoItem[]> = new Map(groups.map((group): [typeof group, InfoItem[]] => [group, results.filter(item => item.type === group)]));

      const splitInfo = (ary: InfoItem[]) => ary
        .sort((a, b) => strcmp(a.key.toLowerCase(), b.key.toLowerCase()))
        .map((item): [string, string] => [`   ${item.key}${item.flair ? ' ' + chalk.dim('(' + item.flair + ')') : ''}`, chalk.dim(item.value)]);

      const format = (details: [string, string][]) => columnar(details, { vsep: ':' });

      task.end();

      if (!this.env.project.directory) {
        this.env.log.warn('You are not in an Ionic project directory. Project context may be missing.');
      }

      this.env.log.nl();

      for (const [ group, info ] of groupedInfo.entries()) {
        this.env.log.rawmsg(`${chalk.bold(lodash.startCase(group).toLowerCase())}\n\n`);
        this.env.log.rawmsg(`${format(splitInfo(info))}\n\n`);
      }
    }
  }
}
