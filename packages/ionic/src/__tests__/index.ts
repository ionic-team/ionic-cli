import * as path from 'path';

import { modifyArguments } from '../';

describe('ionic', () => {

  describe('getProjectRootDir', () => {

    jest.resetModules();
    const cliUtils = require('@ionic/cli-utils');
    const getProjectRootDir = require('../').getProjectRootDir;

    it('should get empty string with empty input', async () => {
      const result = await getProjectRootDir('', '');
      expect(result).toEqual('');
    });

    it('should return empty string if project file not found', async () => {
      jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['bar']));
      const result = await getProjectRootDir('/some/dir', 'foo');
      expect(result).toEqual('');
    });

    it('should return project path when project file found in cwd', async () => {
      jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['foo']));
      const result = await getProjectRootDir('/some/dir', 'foo');
      expect(result).toEqual('/some/dir');
    });

    it('should return project path when project file found in one directory back', async () => {
      jest.spyOn(cliUtils, 'fsReadDir')
        .mockImplementationOnce(() => Promise.resolve(['garbage']))
        .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
      const result = await getProjectRootDir('/some/dir', 'foo');
      expect(result).toEqual('/some');
    });

    it('should return project path when project file found in really nested path', async () => {
      jest.spyOn(cliUtils, 'fsReadDir')
        .mockImplementationOnce(() => Promise.resolve(['']))
        .mockImplementationOnce(() => Promise.resolve(['nested']))
        .mockImplementationOnce(() => Promise.resolve(['really']))
        .mockImplementationOnce(() => Promise.resolve(['is']))
        .mockImplementationOnce(() => Promise.resolve(['that']))
        .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
      const result = await getProjectRootDir('/some/dir/that/is/really/nested', 'foo');
      expect(result).toEqual('/some');
    });

    describe('windows', () => {

      jest.resetModules();
      jest.mock('path', () => path.win32);

      const cliUtils = require('@ionic/cli-utils');
      const getProjectRootDir = require('../index').getProjectRootDir;

      it('should get empty string with empty input', async () => {
        const result = await getProjectRootDir('', '');
        expect(result).toEqual('');
      });

      it('should return empty string if project file not found', async () => {
        jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['bar']));
        const result = await getProjectRootDir('C:\\some\\dir', 'foo');
        expect(result).toEqual('');
      });

      it('should return project path when project file found in cwd', async () => {
        jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['foo']));
        const result = await getProjectRootDir('C:\\some\\dir', 'foo');
        expect(result).toEqual('C:\\some\\dir');
      });

      it('should return project path when project file found in one directory back', async () => {
        jest.spyOn(cliUtils, 'fsReadDir')
          .mockImplementationOnce(() => Promise.resolve(['garbage']))
          .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
        const result = await getProjectRootDir('C:\\some\\dir', 'foo');
        expect(result).toEqual('C:\\some');
      });

      it('should return project path when project file found in really nested path', async () => {
        jest.spyOn(cliUtils, 'fsReadDir')
          .mockImplementationOnce(() => Promise.resolve(['']))
          .mockImplementationOnce(() => Promise.resolve(['nested']))
          .mockImplementationOnce(() => Promise.resolve(['really']))
          .mockImplementationOnce(() => Promise.resolve(['is']))
          .mockImplementationOnce(() => Promise.resolve(['that']))
          .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
        const result = await getProjectRootDir('C:\\some\\dir\\\\that\\is\\really\\nested', 'foo');
        expect(result).toEqual('C:\\some');
      });

    });

  });

  describe('modifyArguments', () => {

    it('should insert help arg with empty pargv', () => {
      const args = modifyArguments([]);
      expect(args).toEqual(['help']);
    });

    it('should insert help arg if -h found', () => {
      const args = modifyArguments(['-h']);
      expect(args).toEqual(['help']);
    });

    it('should insert help arg if --help found', () => {
      const args = modifyArguments(['--help']);
      expect(args).toEqual(['help']);
    });

    it('should insert help arg with additional arg if -h found', () => {
      const args = modifyArguments(['foo', '-h']);
      expect(args).toEqual(['help', 'foo']);
    });

    it('should insert help arg with additional args if --help found', () => {
      const args = modifyArguments(['foo', '--help', 'bar', 'baz']);
      expect(args).toEqual(['help', 'foo', 'bar', 'baz']);
    });

    it('should insert version arg if -v found', () => {
      const args = modifyArguments(['-v']);
      expect(args).toEqual(['version']);
    });

    it('should insert version arg if --version found', () => {
      const args = modifyArguments(['--version']);
      expect(args).toEqual(['version']);
    });

    it('should not modify if -v and other args found', () => {
      const args = modifyArguments(['foo', '-v', 'bar']);
      expect(args).toEqual(['foo', '-v', 'bar']);
    });

    it('should not modify if --version and other args found', () => {
      const args = modifyArguments(['foo', '--version', 'bar']);
      expect(args).toEqual(['foo', '--version', 'bar']);
    });

    it('should change lab command to serve --lab', () => {
      const args = modifyArguments(['lab', '--opt', 'foo']);
      expect(args).toEqual(['serve', '--opt', 'foo', '--lab']);
    });

    it('should change --verbose to --log-level=debug', () => {
      const args = modifyArguments(['foo', '--verbose', 'bar']);
      expect(args).toEqual(['foo', '--log-level=debug', 'bar']);
    });

  });

});
