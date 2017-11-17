import * as path from 'path';

import * as SSHConfig from 'ssh-config';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

import { ensureHostAndKeyPath } from '../ssh-config';

describe('@ionic/cli-utils', () => {

  describe('lib/ssh-config', () => {

    describe('ensureHostAndKeyPath', () => {

      const expected = 'Host bar\n    IdentityFile /id_rsa\n';

      it('should stringify with empty file', async () => {
        const conf = SSHConfig.parse('');
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        expect(SSHConfig.stringify(conf)).toEqual(expected);
      });

      it('should stringify with config1 file', async () => {
        const config1 = await fsReadFile(path.resolve(__dirname, 'fixtures/ssh-config/config1'), { encoding: 'utf8' });
        const conf = SSHConfig.parse(config1);
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        expect(SSHConfig.stringify(conf)).toEqual(`${config1}\n${expected}`);
      });

      it('should stringify with config2 file', async () => {
        const config2 = await fsReadFile(path.resolve(__dirname, 'fixtures/ssh-config/config2'), { encoding: 'utf8' });
        const conf = SSHConfig.parse(config2);
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        expect(SSHConfig.stringify(conf)).toEqual(`${config2}\n\n${expected}`);
      });

      it('should stringify with config3 file', async () => {
        const config3 = await fsReadFile(path.resolve(__dirname, 'fixtures/ssh-config/config3'), { encoding: 'utf8' });
        const conf = SSHConfig.parse(config3);
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        expect(SSHConfig.stringify(conf)).toEqual(config3);
      });

      it('should stringify with config4 file', async () => {
        const config4 = await fsReadFile(path.resolve(__dirname, 'fixtures/ssh-config/config4'), { encoding: 'utf8' });
        const conf = SSHConfig.parse(config4);
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        const s = config4.split('\n');
        s[s.length - 2] = '    IdentityFile /id_rsa';
        expect(SSHConfig.stringify(conf)).toEqual(s.join('\n'));
      });

      it('should stringify with config5 file', async () => {
        const config5 = await fsReadFile(path.resolve(__dirname, 'fixtures/ssh-config/config5'), { encoding: 'utf8' });
        const conf = SSHConfig.parse(config5);
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        expect(SSHConfig.stringify(conf)).toEqual(config5);
      });

      it('should stringify with config6 file', async () => {
        const config6 = await fsReadFile(path.resolve(__dirname, 'fixtures/ssh-config/config6'), { encoding: 'utf8' });
        const conf = SSHConfig.parse(config6);
        ensureHostAndKeyPath(conf, { host: 'bar' }, '/id_rsa');
        expect(SSHConfig.stringify(conf)).toEqual(`${config6}\n${expected}`);
      });

    });

  });

});
