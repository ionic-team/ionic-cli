import * as fs from 'fs-extra';

export async function stat(p: string): Promise<fs.Stats | undefined> {
  try {
    return await fs.stat(p);
  } catch (e: any) {
    // ignore
  }
}

export async function readdir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (e: any) {
    return [];
  }
}
