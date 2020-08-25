import { enforceLF } from '../utils';

describe('@ionic/cli-framework-output', () => {

  describe('utils', () => {

    describe('enforceLF', () => {

      it('should convert empty string to newline', () => {
        const result = enforceLF('');
        expect(result).toBe('\n');
      });

      it('should do nothing to a single newline', () => {
        const result = enforceLF('\n');
        expect(result).toBe('\n');
      });

      it('should add newline to text without newline', () => {
        const result = enforceLF('some text');
        expect(result).toBe('some text\n');
      });

      it('should do nothing to multiline text with newline at end', () => {
        const result = enforceLF('some text\nsome more\n');
        expect(result).toBe('some text\nsome more\n');
      });

      it('should add newline to multiline text without newline at end', () => {
        const result = enforceLF('some text\nsome more');
        expect(result).toBe('some text\nsome more\n');
      });

    });

  });

});
