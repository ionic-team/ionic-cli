import { runcmd } from './shell';

export async function getCommandInfo(cmd: string, args: string[] = []): Promise<string | undefined> {
  try {
    const out = await runcmd(cmd, args);
    return out.split('\n').join(' ');
  } catch (e) {}
}
