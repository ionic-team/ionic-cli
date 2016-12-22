import { Shell } from '../shell';

describe('shell', () => {
  var shell;
  beforeEach(() => {
    shell = new Shell();
  });

  it('exists should return true if the command does exist', async () => {
    const result = await shell.exists('pwd');
    expect(result).toBeTruthy();
  });

    it('not exists should return false if the command does not exist', async () => {
    const result = await shell.exists('fdkalfjdsakl');
    expect(result).toBeFalsy();
  });
});
