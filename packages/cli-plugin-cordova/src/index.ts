import { INamespaceMap, Namespace, NamespaceMap } from '@ionic/cli';
import { EmulateCommand } from './commands/emulate';

export default class CordovaNamespace extends Namespace {
  public name: 'cloud';

  getNamespaces(): INamespaceMap {
    let m = new NamespaceMap();

    m.set('emulate', new EmulateCommand());

    return m;
  }
}
