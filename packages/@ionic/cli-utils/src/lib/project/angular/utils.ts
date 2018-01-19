import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';

import { AngularCLIJson } from '../../../definitions';
import { isAngularCLIJson } from '../../../guards';

export const ANGULAR_CLI_FILE = '.angular-cli.json';
export const ERROR_INVALID_ANGULAR_CLI_JSON = 'INVALID_ANGULAR_CLI_JSON';

export async function readAngularCLIJsonFile(p: string): Promise<AngularCLIJson> {
  const angularJson = await fsReadJsonFile(p);

  if (!isAngularCLIJson(angularJson)) {
    throw ERROR_INVALID_ANGULAR_CLI_JSON;
  }

  return angularJson;
}
