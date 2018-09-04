import * as path from 'path';

import { injectScript } from '../dev-server';
import { readFile } from '@ionic/utils-fs';

describe('@ionic/ionic-v1', () => {

  describe('dev-server', () => {

    describe('injectScript', () => {

      it('should inject script into empty html', () => {
        const code = '<b>hi</b>';
        const result = injectScript('', code);
        expect(result).toEqual(code);
      });

      it('should inject script into body', () => {
        const htmlGen = (f = '') => `<html><title>test</title><body>${f}</body></html>`;
        const code = '<b>hi</b>';
        const result = injectScript(htmlGen(), code);
        expect(result).toEqual(htmlGen(code));
      });

      it('should inject script at bottom of body', () => {
        const htmlGen = (f = '') => `
<html>
  <head>
    <title>test</title>
  </head>
  <body>
    <p>hello world</p>${f}</body>
</html>`.trim();

        const code = `
    <b>hi</b>
`;

        const result = injectScript(htmlGen(), code);
        expect(result).toEqual(htmlGen(code));
      });

      it('should inject script into app template', async () => {
        // TODO: this test is fragile and gross
        const apphtml = await readFile(path.resolve(__dirname, 'fixtures/dev-server/app.html'), { encoding: 'utf8' });
        const code = `
    <script src="script.js"></script>
`;

        const result = injectScript(apphtml, code);
        const lines = apphtml.split('\n');
        lines.splice(-3);
        expect(result).toEqual(lines.join('\n') + '\n  ' + code + '</body>\n</html>\n');
      });

    });

  });

});
