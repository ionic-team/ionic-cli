import { links2md } from '../docs';

describe('@ionic/cli-scripts', () => {

  describe('docs', () => {

    describe('links2md', () => {

      it('should work with empty string', () => {
        const result = links2md('');
        expect(result).toEqual('');
      });

      it('should work with multiple lines', () => {
        const result = links2md('hello\nworld!\n');
        expect(result).toEqual('hello\nworld!\n');
      });

      it('should replace a link with md version', () => {
        const website = 'https://ionicframework.com';
        const result = links2md(website);
        expect(result).toEqual(`[${website}](${website})`);
      });

      it('should replace links with md', () => {
        const website = 'https://ionicframework.com';
        const result = links2md(`visit my cool website: **${website}**\nthank you`);
        expect(result).toEqual(`visit my cool website: **[${website}](${website})**\nthank you`);
      });

      it('should escape footnote numbers', () => {
        const website = 'https://ionicframework.com';
        const result = links2md(`See the docs[1]\n\n[1]: **${website}**`);
        expect(result).toEqual(`See the docs\\[1\\]\n\n\\[1\\]: **[${website}](${website})**`);
      });

    });

  });

});
