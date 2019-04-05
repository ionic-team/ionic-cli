import { Project } from '../';
import { strong } from '../../color';
import { RunnerNotFoundException } from '../../errors';

import * as ζbuild from './build';
import * as ζserve from './serve';

export class CustomProject extends Project {
  readonly type: 'custom' = 'custom';

  /**
   * We can't detect custom project types. We don't know what they look like!
   */
  async detected() {
    return false;
  }

  async requireBuildRunner(): Promise<ζbuild.CustomBuildRunner> {
    const { CustomBuildRunner } = await import('./build');
    const deps = { ...this.e, project: this };
    return new CustomBuildRunner(deps);
  }

  async requireServeRunner(): Promise<ζserve.CustomServeRunner> {
    const { CustomServeRunner } = await import('./serve');
    const deps = { ...this.e, project: this };
    return new CustomServeRunner(deps);
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform generate for custom projects.\n` +
      `Since you're using the ${strong('custom')} project type, this command won't work. The Ionic CLI doesn't know how to generate framework components for custom projects.`
    );
  }
}
