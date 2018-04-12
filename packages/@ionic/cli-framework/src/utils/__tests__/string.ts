import { isValidURL, slugify } from '../string';

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

    describe('slugify', () => {

      it('should pass back the empty string', () => {
        const response = slugify('');
        expect(response).toEqual('');
      });

      it('should not change slugified input', () => {
        const response = slugify('foo');
        expect(response).toEqual('foo');
      });

      it('should trim whitespace', () => {
        const response = slugify(' foo ');
        expect(response).toEqual('foo');
      });

      it('should lowercase input', () => {
        const response = slugify('FOO');
        expect(response).toEqual('foo');
      });

      it('should convert input to kebab case by default', () => {
        const response = slugify('foo bar   baz');
        expect(response).toEqual('foo-bar-baz');
      });

      it('should convert input to snake case with underscore separator', () => {
        const response = slugify('foo bar   baz', { separator: '_' });
        expect(response).toEqual('foo_bar_baz');
      });

      it('should strip out invalid characters', () => {
        const response = slugify('~ ` ! @ # $ % ^ & * ( ) - = + [ { } ] \' \\ | / > < . , ; : "');
        expect(response).toEqual('');
      });

      it('should convert inferred words to kebab case', () => {
        const response = slugify('MyCoolApp');
        expect(response).toEqual('my-cool-app');
      });

      it('should trim whitespace', () => {
        const response = slugify(' foo ');
        expect(response).toEqual('foo');
      });

      it('should strip out apostrophes', () => {
        const response = slugify(' foo\'s bar ');
        expect(response).toEqual('foos-bar');
      });

      it('should convert ÀÁÂÃÄÅ and àáâãäå characters', () => {
        const response = slugify('ÀÁÂÃÄÅ àáâãäå');
        expect(response).toEqual('a'.repeat(6) + '-' + 'a'.repeat(6));
      });

      it('should convert Ææ characters', () => {
        const response = slugify('Ææ');
        expect(response).toEqual('ae'.repeat(2));
      });

      it('should convert Çç characters', () => {
        const response = slugify('Çç');
        expect(response).toEqual('cc');
      });

      it('should convert ÈÉÊË and èéêë characters', () => {
        const response = slugify('ÈÉÊË èéêë');
        expect(response).toEqual('e'.repeat(4) + '-' + 'e'.repeat(4));
      });

      it('should convert ÌÍÎÏ and ìíîï characters', () => {
        const response = slugify('ÌÍÎÏ ìíîï');
        expect(response).toEqual('i'.repeat(4) + '-' + 'i'.repeat(4));
      });

      it('should convert Ññ characters', () => {
        const response = slugify('Ññ');
        expect(response).toEqual('n'.repeat(2));
      });

      it('should convert ÒÓÔÕÖØ and òóôõöø characters', () => {
        const response = slugify('ÒÓÔÕÖØ òóôõöø');
        expect(response).toEqual('o'.repeat(6) + '-' + 'o'.repeat(6));
      });

      it('should convert ÙÚÛÜ, ùúûü characters', () => {
        const response = slugify('ÙÚÛÜ ùúûü');
        expect(response).toEqual('u'.repeat(4) + '-' + 'u'.repeat(4));
      });

      it('should convert Þþ characters', () => {
        const response = slugify('Þþ');
        expect(response).toEqual('th'.repeat(2));
      });

      it('should convert Ýýÿ characters', () => {
        const response = slugify('Ýýÿ');
        expect(response).toEqual('y'.repeat(3));
      });

      it('should convert ß characters', () => {
        const response = slugify('ß');
        expect(response).toEqual('ss');
      });

    });

  });

});
