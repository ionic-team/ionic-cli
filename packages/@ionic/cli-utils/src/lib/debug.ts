import { createDebugLogger as genlogger} from '@ionic/cli-framework/utils/debug';

export function createDebugLogger(context: string) {
  return genlogger(`ionic:cli-utils:${context}`);
}
