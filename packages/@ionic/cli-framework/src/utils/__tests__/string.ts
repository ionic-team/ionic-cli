import { isValidURL, enforceLF, slugify } from '../string';

describe('@ionic/cli-framework', () => {

  describe('utils/string', () => {

    describe('isValidURL', () => {

      it('should work without parameter', () => {
        expect(isValidURL()).toBe(false);
      });

      it('should work with non-string', () => {
        expect(isValidURL(5)).toBe(false);
      });

      it('should test a non-url', () => {
        expect(isValidURL('this is some text')).toBe(false);
      });

      it('should test text with a colon', () => {
        expect(isValidURL('let me tell you something: hello')).toBe(false);
      });

      it('should test a localhost url', () => {
        expect(isValidURL('http://localhost')).toBe(true);
      });

      it('should test an https url', () => {
        expect(isValidURL('https://ionicframework.com')).toBe(true);
      });

      it('should test a git url', () => {
        expect(isValidURL('git@github.com:ionic-team/ionic-cli.git')).toBe(true);
      });
    });

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

    describe('slugify', () => {

      it('should pass back the empty string', () => {
        const result = slugify('');
        expect(result).toEqual('');
      });

      it('should not change slugified input', () => {
        const result = slugify('foo');
        expect(result).toEqual('foo');
      });

      it('should trim whitespace', () => {
        const result = slugify(' foo ');
        expect(result).toEqual('foo');
      });

      it('should lowercase input', () => {
        const result = slugify('FOO');
        expect(result).toEqual('foo');
      });

      it('should convert input to kebab case by default', () => {
        const result = slugify('foo bar   baz');
        expect(result).toEqual('foo-bar-baz');
      });

      it('should convert input to snake case with underscore separator', () => {
        const result = slugify('foo bar   baz', { separator: '_' });
        expect(result).toEqual('foo_bar_baz');
      });

      it('should strip out invalid characters', () => {
        const result = slugify('~ ` ! @ # $ % ^ & * ( ) - = + [ { } ] \' \\ | / > < . , ; : "');
        expect(result).toEqual('');
      });

      it('should convert inferred words to kebab case', () => {
        const result = slugify('MyCoolApp');
        expect(result).toEqual('my-cool-app');
      });

      it('should trim whitespace', () => {
        const result = slugify(' foo ');
        expect(result).toEqual('foo');
      });

      it('should strip out apostrophes', () => {
        const result = slugify(' foo\'s bar ');
        expect(result).toEqual('foos-bar');
      });

      it('should convert ÀÁÂÃÄÅ and àáâãäå characters', () => {
        const result = slugify('ÀÁÂÃÄÅ àáâãäå');
        expect(result).toEqual('a'.repeat(6) + '-' + 'a'.repeat(6));
      });

      it('should convert Ææ characters', () => {
        const result = slugify('Ææ');
        expect(result).toEqual('ae'.repeat(2));
      });

      it('should convert Çç characters', () => {
        const result = slugify('Çç');
        expect(result).toEqual('cc');
      });

      it('should convert ÈÉÊË and èéêë characters', () => {
        const result = slugify('ÈÉÊË èéêë');
        expect(result).toEqual('e'.repeat(4) + '-' + 'e'.repeat(4));
      });

      it('should convert ÌÍÎÏ and ìíîï characters', () => {
        const result = slugify('ÌÍÎÏ ìíîï');
        expect(result).toEqual('i'.repeat(4) + '-' + 'i'.repeat(4));
      });

      it('should convert Ññ characters', () => {
        const result = slugify('Ññ');
        expect(result).toEqual('n'.repeat(2));
      });

      it('should convert ÒÓÔÕÖØ and òóôõöø characters', () => {
        const result = slugify('ÒÓÔÕÖØ òóôõöø');
        expect(result).toEqual('o'.repeat(6) + '-' + 'o'.repeat(6));
      });

      it('should convert ÙÚÛÜ, ùúûü characters', () => {
        const result = slugify('ÙÚÛÜ ùúûü');
        expect(result).toEqual('u'.repeat(4) + '-' + 'u'.repeat(4));
      });

      it('should convert Þþ characters', () => {
        const result = slugify('Þþ');
        expect(result).toEqual('th'.repeat(2));
      });

      it('should convert Ýýÿ characters', () => {
        const result = slugify('Ýýÿ');
        expect(result).toEqual('y'.repeat(3));
      });

      it('should convert ß characters', () => {
        const result = slugify('ß');
        expect(result).toEqual('ss');
      });

    });

  });

});
