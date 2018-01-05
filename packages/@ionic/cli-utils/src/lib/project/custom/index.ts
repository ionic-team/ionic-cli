import { ProjectType } from '../../../definitions';

import { BaseProject } from '../';

export class Project extends BaseProject {
  type: ProjectType = 'custom';

  /**
   * We can't detect custom project types. We don't know what they look like!
   */
  async detected() {
    return false;
  }
}
