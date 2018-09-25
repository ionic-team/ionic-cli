import chalk from 'chalk';

import { Project } from '../';
import { RunnerNotFoundException } from '../../errors';

export class CustomProject extends Project {
  readonly type: 'custom' = 'custom';

  /**
   * We can't detect custom project types. We don't know what they look like!
   */
  async detected() {
    return false;
  }

  async requireBuildRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform build for custom projects.\n` +
      `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to build custom projects.`
    );
  }

  async requireServeRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform serve for custom projects.\n` +
      `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to serve custom projects.`
    );
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform generate for custom projects.\n` +
      `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to generate framework components for custom projects.`
    );
  }
}
