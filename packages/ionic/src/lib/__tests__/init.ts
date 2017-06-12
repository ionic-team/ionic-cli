import { modifyArguments } from '../init';

describe('ionic', () => {

  describe('modifyArguments', () => {

    it('should insert help arg with empty pargv', () => {
      const args = modifyArguments([]);
      expect(args).toEqual(['help']);
    });

    it('should insert help arg if -h found', () => {
      const args = modifyArguments(['-h']);
      expect(args).toEqual(['help']);
    });

    it('should insert help arg if --help found', () => {
      const args = modifyArguments(['--help']);
      expect(args).toEqual(['help']);
    });

    it('should insert help arg with additional arg if -h found', () => {
      const args = modifyArguments(['foo', '-h']);
      expect(args).toEqual(['help', 'foo']);
    });

    it('should insert help arg with additional args if --help found', () => {
      const args = modifyArguments(['foo', '--help', 'bar', 'baz']);
      expect(args).toEqual(['help', 'foo', 'bar', 'baz']);
    });

    it('should insert version arg if -v found', () => {
      const args = modifyArguments(['-v']);
      expect(args).toEqual(['version']);
    });

    it('should insert version arg if --version found', () => {
      const args = modifyArguments(['--version']);
      expect(args).toEqual(['version']);
    });

    it('should not modify if -v and other args found', () => {
      const args = modifyArguments(['foo', '-v', 'bar']);
      expect(args).toEqual(['foo', '-v', 'bar']);
    });

    it('should not modify if --version and other args found', () => {
      const args = modifyArguments(['foo', '--version', 'bar']);
      expect(args).toEqual(['foo', '--version', 'bar']);
    });

    it('should change lab command to serve --lab', () => {
      const args = modifyArguments(['lab', '--opt', 'foo']);
      expect(args).toEqual(['serve', '--opt', 'foo', '--lab']);
    });

    it('should change --verbose to --log-level=debug', () => {
      const args = modifyArguments(['foo', '--verbose', 'bar']);
      expect(args).toEqual(['foo', '--log-level=debug', 'bar']);
    });

  });

});
