import { CORDOVA_INTENT, filterArgumentsForCordova } from '../utils';

describe('@ionic/cli-utils', () => {

  describe('filterArgumentsForCordova', () => {
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
          intent: CORDOVA_INTENT,
        },
        {
          name: 'cdvopt2',
          description: '',
          type: Boolean,
          intent: CORDOVA_INTENT,
        },
      ]
    };

    it('should return the command name and inputs if no options passed', () => {
      let inputs = ['ios'];
      let options = { _: [], boolopt: false, cdvopt1: null, cdvopt2: false };

      const result = filterArgumentsForCordova(metadata, inputs, options);
      expect(result).toEqual(['build', 'ios']);
    });

    it('should only include options with the Cordova intent', () => {
      let inputs = ['ios'];
      let options = { _: [], boolopt: true, cdvopt1: 'foo', cdvopt2: true };

      const result = filterArgumentsForCordova(metadata, inputs, options);
      expect(result).toEqual(['build', 'ios', '--cdvopt1', 'foo', '--cdvopt2']);
    });

    it('should include unparsed options', () => {
      let inputs = ['android', '--', '--gradleArg=-PcdvBuildMultipleApks=true'];
      let options = { _: [], boolopt: true, cdvopt1: 'foo', cdvopt2: true };

      const result = filterArgumentsForCordova(metadata, inputs, options);
      expect(result).toEqual(['build', 'android', '--cdvopt1', 'foo', '--cdvopt2', '--', '--gradleArg=-PcdvBuildMultipleApks=true']);
    });

  });

});
