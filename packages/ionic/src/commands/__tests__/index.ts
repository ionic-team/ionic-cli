import { metadataToCmdOptsEnv } from '../index';

describe('@ionic/cli-utils', () => {

  describe('commands', () => {

    describe('metadataToCmdOptsEnv', () => {

      const metadata = {
        fullName: 'foo bar',
        options: [
          {
            name: 'baz',
            description: '',
          },
          {
            name: 'opt-with-dashes',
            description: '',
          },
        ],
      };

      it('should return empty array for command with no options', () => {
        const result = metadataToCmdOptsEnv({ options: [] }, ['cmd']);
        expect(result.size).toEqual(0);
      });

      it('should return schema for options', () => {
        const result = metadataToCmdOptsEnv(metadata, ['foo', 'bar']);
        const envvars = [...result.values()];
        expect(envvars.length).toEqual(2);
        expect(envvars).toContain('IONIC_CMDOPTS_FOO_BAR_BAZ');
        expect(envvars).toContain('IONIC_CMDOPTS_FOO_BAR_OPT_WITH_DASHES');
      });

    });

  });

});
