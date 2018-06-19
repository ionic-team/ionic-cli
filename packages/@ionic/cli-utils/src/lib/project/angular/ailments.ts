import { AilmentDeps } from '../../doctor';

import { AngularProject } from './';

export interface AngularAilmentDeps extends AilmentDeps {
  readonly project: AngularProject;
}

// abstract class AngularAilment extends Ailment {
//   readonly projects: ProjectType[] = ['angular'];
//   protected readonly project: AngularProject;

//   constructor(deps: AngularAilmentDeps) {
//     super(deps);
//     this.project = deps.project;
//   }
// }
