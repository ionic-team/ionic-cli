import chalk from 'chalk';

import { CommandGroup } from '@ionic/cli-framework';

import { CommandMetadata, GenerateOptions } from '../../../definitions';
import { FatalException } from '../../errors';
import { GenerateRunner as BaseGenerateRunner } from '../../generate';

const description = `
Use ${chalk.green('npx ng generate')} to generate framework components. See the documentation${chalk.cyan('[1]')} for details.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/building/scaffolding')}
`;

export class GenerateRunner extends BaseGenerateRunner<GenerateOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      description,
      groups: [CommandGroup.Hidden],
    };
  }

  async run(options: GenerateOptions) {
    throw new FatalException(description.trim());
  }
}
