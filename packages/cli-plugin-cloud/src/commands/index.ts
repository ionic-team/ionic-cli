import { INamespaceMap, Namespace, NamespaceMap } from '@ionic/cli-utils';

import { GitNamespace } from './git';
import { SSHNamespace } from './ssh';

export class CloudNamespace extends Namespace {
  public name: 'cloud';

  getNamespaces(): INamespaceMap {
    let m = new NamespaceMap();

    m.set('git', new GitNamespace());
    m.set('ssh', new SSHNamespace());

    return m;
  }
}
