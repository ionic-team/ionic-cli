import { CommandMap, INamespaceMap, Namespace, NamespaceMap } from '@ionic/cli';
import { SSHNamespace } from './commands/ssh';

export default class CloudNamespace extends Namespace {
  public name: 'cloud';

  getNamespaces(): INamespaceMap {
    let m = new NamespaceMap();

    m.set('ssh', new SSHNamespace(this.env));

    return m;
  }
}
