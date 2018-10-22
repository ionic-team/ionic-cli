import { filterArgumentsForCordova, generateOptionsForCordovaBuild } from '../utils';
import { CommandMetadata } from '../../../../definitions';

describe('ionic', () => {

  const buildMetadata: CommandMetadata = {
    name: 'build',
    summary: '',
    type: 'global',
    inputs: [
      {
        name: 'platform',
        summary: '',
      }
    ],
    options: [
      {
        name: 'boolopt',
        summary: '',
        type: Boolean,
        default: false,
      },
      {
        name: 'cdvopt1',
        summary: '',
        groups: ['cordova'],
      },
      {
        name: 'cdvopt2',
        summary: '',
        type: Boolean,
        groups: ['cordova'],
      },
      {
        name: 'prod',
        summary: '',
        type: Boolean,
        groups: ['app-scripts'],
      },
      {
        name: 'optimizejs',
        summary: '',
        type: Boolean,
        groups: ['app-scripts'],
      },
    ]
  };

  const platformMetadata: CommandMetadata = {
    name: 'platform',
    summary: '',
    type: 'global',
    inputs: [
      {
        name: 'action',
        summary: '',
      },
      {
        name: 'platform',
        summary: '',
      }
    ],
    options: [
      {
        name: 'boolopt',
        summary: '',
        type: Boolean,
        default: false,
      },
    ]
  };

  describe('filterArgumentsForCordova', () => {

    it('should return the command name and inputs if no options passed', () => {
      const options = { _: ['ios'], boolopt: false, cdvopt1: null, cdvopt2: false, prod: true, optimizejs: true };
      const result = filterArgumentsForCordova(buildMetadata, options);
      expect(result).toEqual(['build', 'ios']);
    });

    it('should only include options with the Cordova intent', () => {
      const options = { _: ['ios'], boolopt: true, cdvopt1: 'foo', cdvopt2: true, prod: true, optimizejs: true };
      const result = filterArgumentsForCordova(buildMetadata, options);
      expect(result).toEqual(['build', 'ios', '--cdvopt1', 'foo', '--cdvopt2']);
    });

    it('should include --verbose', () => {
      const options = { _: ['ios'], boolopt: true, cdvopt1: 'foo', cdvopt2: true, prod: true, optimizejs: true, verbose: true };
      const result = filterArgumentsForCordova(buildMetadata, options);
      expect(result).toEqual(['build', 'ios', '--cdvopt1', 'foo', '--cdvopt2', '--verbose']);
    });

    it('should include additional options', () => {
      const options = { _: ['android'], '--': ['--someopt'], boolopt: true, cdvopt1: 'foo', cdvopt2: true, prod: true, optimizejs: true };
      const result = filterArgumentsForCordova(buildMetadata, options);
      expect(result).toEqual(['build', 'android', '--cdvopt1', 'foo', '--cdvopt2', '--someopt']);
    });

    it('should include additional and unparsed options', () => {
      const options = { _: ['android'], '--': ['--someopt', '--', '--gradleArg=-PcdvBuildMultipleApks=true'], boolopt: true, cdvopt1: 'foo', cdvopt2: true, prod: true, optimizejs: true };
      const result = filterArgumentsForCordova(buildMetadata, options);
      expect(result).toEqual(['build', 'android', '--cdvopt1', 'foo', '--cdvopt2', '--someopt', '--', '--gradleArg=-PcdvBuildMultipleApks=true']);
    });

    it('should respect --nosave', () => {
      const options = { _: ['add', 'android'], '--': [], nosave: true };
      const result = filterArgumentsForCordova(platformMetadata, options);
      expect(result).toEqual(['platform', 'add', 'android', '--nosave']);
    });

  });

  describe('generateOptionsForCordovaBuild', () => {

    it('should return added options even for no options passed', () => {
      const inputs = ['ios'];
      const options = { _: [] };

      const result = generateOptionsForCordovaBuild(buildMetadata, inputs, options);
      expect(result).toEqual({ '_': [], externalAddressRequired: true, nobrowser: true, engine: 'cordova', platform: 'ios' });
    });

    it('should include the options with app-scripts group or no group, but not cordova group', () => {
      const inputs = ['ios'];
      const options = { _: [], boolopt: false, cdvopt1: null, cdvopt2: false, prod: true, optimizejs: true };

      const result = generateOptionsForCordovaBuild(buildMetadata, inputs, options);
      expect(result).toEqual({ '_': [], boolopt: false, externalAddressRequired: true, nobrowser: true, engine: 'cordova', platform: 'ios', prod: true, optimizejs: true });
    });

  });

});
