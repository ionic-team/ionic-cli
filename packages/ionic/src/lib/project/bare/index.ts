import { Project } from '../';
import { RunnerNotFoundException } from '../../errors';

export class BareProject extends Project {
  readonly type: 'bare' = 'bare';

  async detected() {
    return false;
  }

  async requireBuildRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform build for bare projects.\n` +
      `The Ionic CLI doesn't know how to build bare projects.`
    );
  }

  async requireServeRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform serve for bare projects.\n` +
      `The Ionic CLI doesn't know how to serve bare projects.`
    );
  }

  async requireGenerateRunner(): Promise<never> {
    throw new RunnerNotFoundException(
      `Cannot perform generate for bare projects.\n` +
      `The Ionic CLI doesn't know how to generate framework components for bare projects.`
    );
  }
}
