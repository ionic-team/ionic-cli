import { filterArgumentsForCordova, generateBuildOptions } from '../utils';

describe('@ionic/cli-utils', () => {

  const metadata = {
    name: 'build',
    description: '',
    inputs: [
      {
        name: 'platform',
        description: ''
      }
    ],
    options: [
      {
        name: 'boolopt',
        description: '',
        type: Boolean,
        default: false,
      },
      {
        name: 'cdvopt1',
        description: '',
        intent: 'cordova',
      },
      {
        name: 'cdvopt2',
        description: '',
        type: Boolean,
        intent: 'cordova',
      },
      {
        name: 'prod',
        description: '',
        type: Boolean,
        intent: 'app-scripts',
      },
      {
        name: 'optimizejs',
        description: '',
        type: Boolean,
        intent: 'app-scripts',
      },
    ]
  };

  describe('filterArgumentsForCordova', () => {

    it('should return the command name and inputs if no options passed', () => {
      let inputs = ['ios'];
      let options = { _: [], boolopt: false, cdvopt1: null, cdvopt2: false, prod: true, optimizejs: true };

      const result = filterArgumentsForCordova(metadata, inputs, options);
      expect(result).toEqual(['build', 'ios']);
    });

    it('should only include options with the Cordova intent', () => {
      let inputs = ['ios'];
      let options = { _: [], boolopt: true, cdvopt1: 'foo', cdvopt2: true, prod: true, optimizejs: true };

      const result = filterArgumentsForCordova(metadata, inputs, options);
      expect(result).toEqual(['build', 'ios', '--cdvopt1', 'foo', '--cdvopt2']);
    });

    it('should include unparsed options', () => {
      let inputs = ['android', '--', '--gradleArg=-PcdvBuildMultipleApks=true'];
      let options = { _: [], boolopt: true, cdvopt1: 'foo', cdvopt2: true, prod: true, optimizejs: true };

      const result = filterArgumentsForCordova(metadata, inputs, options);
      expect(result).toEqual(['build', 'android', '--cdvopt1', 'foo', '--cdvopt2', '--', '--gradleArg=-PcdvBuildMultipleApks=true']);
    });

  });

  describe('generateBuildOptions', () => {

    it('should return added options even for no options passed', () => {
      let inputs = ['ios'];
      let options = { _: [] };

      const result = generateBuildOptions(metadata, options);
      expect(result).toEqual({ '--': undefined, '_': [], externalAddressRequired: true, iscordovaserve: true, nobrowser: true, target: "cordova" });
    });

    it('should include the options with app-scripts intent and with no intent', () => {
      let inputs = ['ios'];
      let options = { _: [], boolopt: false, cdvopt1: null, cdvopt2: false, prod: true, optimizejs: true };

      const result = generateBuildOptions(metadata, options);
      expect(result).toEqual({ '--': undefined, '_': [], boolopt: false, externalAddressRequired: true, iscordovaserve: true, nobrowser: true, target: "cordova", prod: true, optimizejs: true });
    });

  });

});
