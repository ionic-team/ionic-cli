import { runCommand, IonicEnvironment } from '@ionic/cli-utils';
import { IonicNamespace } from './commands';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const ionicNamespace = new IonicNamespace();

  await runCommand({
    namespace: ionicNamespace,
    ...envInstance
  });
}
