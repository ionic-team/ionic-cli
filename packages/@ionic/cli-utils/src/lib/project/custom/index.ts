import { Project } from '../';

export class CustomProject extends Project {
  readonly type: 'custom' = 'custom';

  /**
   * We can't detect custom project types. We don't know what they look like!
   */
  async detected() {
    return false;
  }
}
