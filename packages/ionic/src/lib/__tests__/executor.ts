import { CommandMetadata } from '../../definitions';
import { metadataToCmdOptsEnv } from '../executor';

describe('ionic', () => {

  describe('lib/executor', () => {

    describe('metadataToCmdOptsEnv', () => {

      const metadata: CommandMetadata = {
        name: '',
        summary: '',
        type: 'global',
        options: [
          {
            name: 'baz',
            summary: '',
          },
          {
            name: 'opt-with-dashes',
            summary: '',
          },
        ],
      };

      it('should return empty array for command with no options', () => {
        const result = metadataToCmdOptsEnv({ name: '', summary: '', type: 'global', options: [] }, ['cmd']);
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
