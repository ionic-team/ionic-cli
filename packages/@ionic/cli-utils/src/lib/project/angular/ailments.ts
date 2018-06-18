import { IAilmentRegistry } from '../../../definitions';
import { AilmentDeps } from '../../doctor/ailments';

import { AngularProject } from './';

export async function registerAilments(registry: IAilmentRegistry, deps: AngularAilmentDeps): Promise<void> {
  // TODO: register ailments
}

interface AngularAilmentDeps extends AilmentDeps {
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
