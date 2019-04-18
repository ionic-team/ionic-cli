import { failure, input, strong } from './color';

export async function diffPatch(filename: string, text1: string, text2: string): Promise<string> {
  const JsDiff = await import('diff');

  return JsDiff.createPatch(filename, text1, text2, '', '').split('\n').map(line => {
    if (line.indexOf('-') === 0 && line.indexOf('---') !== 0) {
      line = strong(failure(line));
    } else if (line.indexOf('+') === 0 && line.indexOf('+++') !== 0) {
      line = strong(input(line));
    }

    return line;
  }).slice(2).join('\n');
}
