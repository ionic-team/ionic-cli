describe('@ionic/cli', () => {

  describe('lib/utils/npm', () => {

    describe('pkgManagerArgs', () => {

      jest.resetModules();
      const { pkgManagerArgs } = require('../npm');

      it('should be pkg install with default args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'install' });
        expect(result).toEqual(['npm', 'i']);
      });

      it('should be pkg install args for local package', async () => {
        const result = await pkgManagerArgs('npm', { command: 'install', pkg: 'foo' });
        expect(result).toEqual(['npm', 'i', '--save', '-E', 'foo']);
      });

      it('should be pkg install args for local package install and save dev', async () => {
        const result = await pkgManagerArgs('npm', { command: 'install', pkg: 'foo', saveDev: true });
        expect(result).toEqual(['npm', 'i', '-D', '-E', 'foo']);
      });

      it('should be pkg install args for local package uninstall', async () => {
        const result = await pkgManagerArgs('npm', { command: 'uninstall', pkg: 'foo', saveDev: true });
        expect(result).toEqual(['npm', 'uninstall', '-D', 'foo']);
      });

      it('should be pkg install args for global package install', async () => {
        const result = await pkgManagerArgs('npm', { command: 'install', pkg: 'foo', global: true });
        expect(result).toEqual(['npm', 'i', '-g', 'foo']);
      });

      it('should be pkg install args for global package install with bad options', async () => {
        const result = await pkgManagerArgs('npm', { command: 'install', pkg: 'foo', global: true, saveDev: true });
        expect(result).toEqual(['npm', 'i', '-g', 'foo']);
      });

      it('should be dedupe args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'dedupe' });
        expect(result).toEqual(['npm', 'dedupe']);
      });

      it('should be rebuild args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'rebuild' });
        expect(result).toEqual(['npm', 'rebuild']);
      });

      it('should be bare run args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'run' });
        expect(result).toEqual(['npm', 'run']);
      });

      it('should be run args with script', async () => {
        const result = await pkgManagerArgs('npm', { command: 'run', script: 'test' });
        expect(result).toEqual(['npm', 'run', 'test']);
      });

      it('should be run args with script and script args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'run', script: 'test', scriptArgs: ['-s'] });
        expect(result).toEqual(['npm', 'run', 'test', '--', '-s']);
      });

      it('should be info args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'info' });
        expect(result).toEqual(['npm', 'info']);
      });

      it('should be pkg info args', async () => {
        const result = await pkgManagerArgs('npm', { command: 'info', pkg: '@ionic/cli' });
        expect(result).toEqual(['npm', 'info', '@ionic/cli']);
      });

      it('should be pkg info args with json flag', async () => {
        const result = await pkgManagerArgs('npm', { command: 'info', pkg: '@ionic/cli', json: true });
        expect(result).toEqual(['npm', 'info', '@ionic/cli', '--json']);
      });

      describe('yarn', () => {

        jest.resetModules();
        const { pkgManagerArgs } = require('../npm');

        it('should be pkg install with default args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'install' });
          expect(result).toEqual(['yarn', 'install', '--non-interactive']);
        });

        it('should be pkg install args for local package', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'install', pkg: 'foo' });
          expect(result).toEqual(['yarn', 'add', '--exact', '--non-interactive', 'foo']);
        });

        it('should be pkg install args for local package install', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'install', pkg: 'foo', saveDev: true });
          expect(result).toEqual(['yarn', 'add', '--dev', '--exact', '--non-interactive', 'foo']);
        });

        it('should be pkg install args for local package uninstall', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'uninstall', pkg: 'foo', saveDev: true });
          expect(result).toEqual(['yarn', 'remove', '--dev', '--non-interactive', 'foo']);
        });

        it('should be pkg install args for global package install', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'install', pkg: 'foo', global: true });
          expect(result).toEqual(['yarn', 'global', 'add', '--non-interactive', 'foo']);
        });

        it('should be pkg install args for global package install with bad options', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'install', pkg: 'foo', global: true, saveDev: true });
          expect(result).toEqual(['yarn', 'global', 'add', '--non-interactive', 'foo']);
        });

        it('should be dedupe args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'dedupe' });
          expect(result).toEqual([]); // yarn doesn't support dedupe
        });

        it('should be rebuild args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'rebuild' });
          expect(result).toEqual(['yarn', 'install', '--non-interactive', '--force']);
        });

        it('should be run args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'run' });
          expect(result).toEqual(['yarn', 'run', '--non-interactive']);
        });

        it('should be run args with script', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'run', script: 'test' });
          expect(result).toEqual(['yarn', 'run', '--non-interactive', 'test']);
        });

        it('should be run args with script and script args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'run', script: 'test', scriptArgs: ['-s'] });
          expect(result).toEqual(['yarn', 'run', '--non-interactive', 'test', '-s']);
        });

        it('should be info args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'info' });
          expect(result).toEqual(['yarn', 'info', '--non-interactive']);
        });

        it('should be pkg info args', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'info', pkg: '@ionic/cli' });
          expect(result).toEqual(['yarn', 'info', '--non-interactive', '@ionic/cli']);
        });

        it('should be pkg info args with json flag', async () => {
          const result = await pkgManagerArgs('yarn', { command: 'info', pkg: '@ionic/cli', json: true });
          expect(result).toEqual(['yarn', 'info', '--non-interactive', '@ionic/cli', '--json']);
        });

      });

      describe('pnpm', () => {

        jest.resetModules();
        const { pkgManagerArgs } = require('../npm');

        it('should be pkg install with default args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'install' });
          expect(result).toEqual(['pnpm', 'install']);
        });

        it('should be pkg install args for local package', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'install', pkg: 'foo' });
          expect(result).toEqual(['pnpm', 'add', '--save-exact', 'foo']);
        });

        it('should be pkg install args for local package install', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'install', pkg: 'foo', saveDev: true });
          expect(result).toEqual(['pnpm', 'add', '--save-dev', '--save-exact', 'foo']);
        });

        it('should be pkg install args for local package uninstall', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'uninstall', pkg: 'foo' });
          expect(result).toEqual(['pnpm', 'remove', 'foo']);
        });

        it('should be pkg install args for global package install', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'install', pkg: 'foo', global: true });
          expect(result).toEqual(['pnpm', 'add', '--global', 'foo']);
        });

        it('should be pkg install args for global package install with bad options', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'install', pkg: 'foo', global: true, saveDev: true });
          expect(result).toEqual(['pnpm', 'add', '--global', 'foo']);
        });

        it('should be dedupe args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'dedupe' });
          expect(result).toEqual([]); // pnpm doesn't support dedupe
        });

        it('should be rebuild args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'rebuild' });
          expect(result).toEqual(['pnpm', 'rebuild']);
        });

        it('should be run args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'run' });
          expect(result).toEqual(['pnpm', 'run']);
        });

        it('should be run args with script', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'run', script: 'test' });
          expect(result).toEqual(['pnpm', 'run',  'test']);
        });

        it('should be run args with script and script args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'run', script: 'test', scriptArgs: ['-s'] });
          expect(result).toEqual(['pnpm', 'run',  'test', '-s']);
        });

        it('should be info args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'info' });
          expect(result).toEqual(['pnpm', 'info']);
        });

        it('should be pkg info args', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'info', pkg: '@ionic/cli' });
          expect(result).toEqual(['pnpm', 'info',  '@ionic/cli']);
        });

        it('should be pkg info args with json flag', async () => {
          const result = await pkgManagerArgs('pnpm', { command: 'info', pkg: '@ionic/cli', json: true });
          expect(result).toEqual(['pnpm', 'info',  '@ionic/cli', '--json']);
        });

      });

    });

  });

});
