import { ansi2md, convertHTMLEntities, links2md } from '../utils';

describe('cli-scripts', () => {

  describe('docs/utils', () => {

    describe('ansi2md', () => {

      it('should not affect regular text', () => {
        const result = ansi2md('hello world');
        expect(result).toEqual('hello world');
      });

      it('should strip yellow', () => {
        const result = ansi2md('hello \u001b[33mworld\u001b[39m');
        expect(result).toEqual('hello world');
      });

      it('should mark cyan as md code', () => {
        const result = ansi2md('hello \u001b[36mworld\u001b[39m');
        expect(result).toEqual('hello `world`');
      });

      it('should mark bold as md bold', () => {
        const result = ansi2md('hello \u001b[1mworld\u001b[22m');
        expect(result).toEqual('hello **world**');
      });

    });

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

    describe('convertHTMLEntities', () => {

      it('should not affect regular text', () => {
        const result = convertHTMLEntities('hello world');
        expect(result).toEqual('hello world');
      });

      it('should not affect symbols that are not tags', () => {
        const result = convertHTMLEntities('I <3 TypeScript');
        expect(result).toEqual('I <3 TypeScript');
      });

      it('should convert tag-like symbols', () => {
        const result = convertHTMLEntities('in the resources/<platform> folder');
        expect(result).toEqual('in the resources/&lt;platform&gt; folder');
      });

      it('should respect tag-like symbols in code ticks', () => {
        const result = convertHTMLEntities('in the `resources/<platform>` folder');
        expect(result).toEqual('in the `resources/<platform>` folder');
      });

    });

  });

});
