describe('@ionic/cli-utils', () => {

  describe('pkgManagerArgs', () => {

    const envMockGen = (opts: { yarn?: boolean } = {}) => ({
      config: { load: async () => ({ yarn: opts.yarn }) },
      log: { debug: () => {} },
      shell: { run: () => {} },
    });

    jest.resetModules();
    const { pkgManagerArgs } = require('../npm');
    const envMock = envMockGen();

    it('should be pkg install with default args', async () => {
      const result = await pkgManagerArgs(envMock, {});
      expect(result).toEqual(['npm', 'i']);
    });

    it('should be pkg install args for local package', async () => {
      const result = await pkgManagerArgs(envMock, { pkg: 'foo' });
      expect(result).toEqual(['npm', 'i', '--save', '-E', 'foo']);
    });

    it('should be pkg install args for local package install and save dev', async () => {
      const result = await pkgManagerArgs(envMock, { pkg: 'foo', saveDev: true });
      expect(result).toEqual(['npm', 'i', '-D', '-E', 'foo']);
    });

    // it('should be pkg link args w/o dist tag', async () => {
    //   const result = await pkgManagerArgs(envMock, { pkg: 'foo@latest', link: true });
    //   expect(result).toEqual(['npm', 'link', 'foo']);
    // });

    it('should be pkg install args for local package uninstall', async () => {
      const result = await pkgManagerArgs(envMock, { pkg: 'foo', command: 'uninstall', saveDev: true });
      expect(result).toEqual(['npm', 'uninstall', '-D', 'foo']);
    });

    it('should be pkg install args for global package install', async () => {
      const result = await pkgManagerArgs(envMock, { pkg: 'foo', global: true });
      expect(result).toEqual(['npm', 'i', '-g', 'foo']);
    });

    it('should be pkg install args for global package install with bad options', async () => {
      const result = await pkgManagerArgs(envMock, { pkg: 'foo', global: true, saveDev: true });
      expect(result).toEqual(['npm', 'i', '-g', 'foo']);
    });

    it('should be dedupe args', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'dedupe' });
      expect(result).toEqual(['npm', 'dedupe']);
    });

    it('should be rebuild args', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'rebuild' });
      expect(result).toEqual(['npm', 'rebuild']);
    });

    it('should be bare run args', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'run' });
      expect(result).toEqual(['npm', 'run']);
    });

    it('should be run args with script', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'run', script: 'test' });
      expect(result).toEqual(['npm', 'run', 'test']);
    });

    it('should be run args with script and script args', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'run', script: 'test', scriptArgs: ['-s'] });
      expect(result).toEqual(['npm', 'run', 'test', '--', '-s']);
    });

    describe('yarn', () => {

      jest.resetModules();
      const { pkgManagerArgs } = require('../npm');
      const envMock = envMockGen({ yarn: true });

      it('should be pkg install with default args', async () => {
        const result = await pkgManagerArgs(envMock, {});
        expect(result).toEqual(['yarn', 'install', '--non-interactive']);
      });

      it('should be pkg install args for local package', async () => {
        const result = await pkgManagerArgs(envMock, { pkg: 'foo' });
        expect(result).toEqual(['yarn', 'add', '--exact', '--non-interactive', 'foo']);
      });

      it('should be pkg install args for local package install', async () => {
        const result = await pkgManagerArgs(envMock, { pkg: 'foo', saveDev: true });
        expect(result).toEqual(['yarn', 'add', '--dev', '--exact', '--non-interactive', 'foo']);
      });

      // it('should be pkg link args w/o dist tag', async () => {
      //   const result = await pkgManagerArgs(envMock, { pkg: 'foo@latest', link: true });
      //   expect(result).toEqual(['yarn', 'link', '--non-interactive', 'foo']);
      // });

      it('should be pkg install args for local package uninstall', async () => {
        const result = await pkgManagerArgs(envMock, { pkg: 'foo', command: 'uninstall', saveDev: true });
        expect(result).toEqual(['yarn', 'remove', '--dev', '--non-interactive', 'foo']);
      });

      it('should be pkg install args for global package install', async () => {
        const result = await pkgManagerArgs(envMock, { pkg: 'foo', global: true });
        expect(result).toEqual(['yarn', 'global', 'add', '--non-interactive', 'foo']);
      });

      it('should be pkg install args for global package install with bad options', async () => {
        const result = await pkgManagerArgs(envMock, { pkg: 'foo', global: true, saveDev: true });
        expect(result).toEqual(['yarn', 'global', 'add', '--non-interactive', 'foo']);
      });

      it('should be dedupe args', async () => {
        const result = await pkgManagerArgs(envMock, { command: 'dedupe' });
        expect(result).toEqual([]); // yarn doesn't support dedupe
      });

      it('should be rebuild args', async () => {
        const result = await pkgManagerArgs(envMock, { command: 'rebuild' });
        expect(result).toEqual(['yarn', 'install', '--non-interactive', '--force']);
      });

      it('should be run args', async () => {
        const result = await pkgManagerArgs(envMock, { command: 'run' });
        expect(result).toEqual(['yarn', 'run', '--non-interactive']);
      });

    it('should be run args with script', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'run', script: 'test' });
      expect(result).toEqual(['yarn', 'run', '--non-interactive', 'test']);
    });

    it('should be run args with script and script args', async () => {
      const result = await pkgManagerArgs(envMock, { command: 'run', script: 'test', scriptArgs: ['-s'] });
      expect(result).toEqual(['yarn', 'run', '--non-interactive', 'test', '-s']);
    });

    });

  });

});
