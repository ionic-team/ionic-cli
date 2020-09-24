import { wordWrap } from '../format';

describe('@ionic/utils-terminal', () => {

  describe('format', () => {

    describe('wordWrap', () => {

      it('should do nothing to empty string', () => {
        const result = wordWrap('', {});
        expect(result).toEqual('');
      });

      it('should do nothing to newline', () => {
        const result = wordWrap('\n', {});
        expect(result).toEqual('\n');
      });

      it('should wrap words', () => {
        const result = wordWrap('hello world', { width: 5 });
        expect(result).toEqual('hello\nworld');
      });

      it('should wrap words with proper indentation', () => {
        const result = wordWrap('hello world', { width: 5, indentation: 5 });
        expect(result).toEqual('hello\n     world');
      });

      it('should wrap many words', () => {
        const result = wordWrap(`I'm sorry Dave, I'm afraid I can't do that.`, { width: 10 });
        expect(result).toEqual(`I'm sorry\nDave, I'm\nafraid I\ncan't do\nthat.`);
      });

      it('should wrap a command and append a character', () => {
        const result = wordWrap(`git commit -m 'Initial commit' --no-gpg-sign`, { width: 40, indentation: 4, append: ' \\' });
        expect(result).toEqual(`git commit -m 'Initial commit' \\\n    --no-gpg-sign`);
      });

    });

  });

});
