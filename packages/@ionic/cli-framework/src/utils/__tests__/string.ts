import { isValidURL } from '../string';

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

  });

});
