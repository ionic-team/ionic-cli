import { CommandMap, Namespace, NamespaceMap } from '@ionic/cli-utils';

import { PackageNamespace } from './package/index';

import { InfoCommand } from './info';
import { LoginCommand } from './login';
import { SignupCommand } from './signup';
import { StartCommand } from './start';
import { VersionCommand } from './version';
import { HelpCommand } from './help';
import { TelemetryCommand } from './telemetry';
import { DocsCommand } from './docs';
import { IonitronCommand } from './ionitron';
import { ServeCommand } from './serve';
import { GenerateCommand } from './generate';
import { LinkCommand } from './link';
import { UploadCommand } from './upload';

export class IonicNamespace extends Namespace {
  name: 'global';

  getNamespaces() {
    const m = new NamespaceMap();

    m.set('package', new PackageNamespace());

    return m;
  }

  getCommands() {
    const m = new CommandMap();

    m.set('start', new StartCommand());
    m.set('serve', new ServeCommand());
    m.set('help', new HelpCommand());
    m.set('info', new InfoCommand());
    m.set('login', new LoginCommand());
    m.set('signup', new SignupCommand());
    m.set('version', new VersionCommand());
    m.set('telemetry', new TelemetryCommand());
    m.set('docs', new DocsCommand());
    m.set('ionitron', new IonitronCommand());
    m.set('generate', new GenerateCommand());
    m.set('link', new LinkCommand());
    m.set('upload', new UploadCommand());

    return m;
  }
}
