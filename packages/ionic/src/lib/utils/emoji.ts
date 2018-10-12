import { TERMINAL_INFO } from '@ionic/cli-framework/utils/terminal';

export function emoji(x: string, fallback: string): string {
  if (TERMINAL_INFO.windows) {
    return fallback;
  }

  return x;
}
