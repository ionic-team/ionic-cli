import * as project from '../project';

describe('@ionic/cli-utils', () => {

  describe('lib/project', () => {

    describe('Project', () => {

      it('should set directory attribute', async () => {
        const p = new project.Project('/path/to/proj', 'ionic.config.json');
        expect(p.directory).toEqual('/path/to/proj');
      });

    });

    describe('Project.getSourceDir', () => {

      it('should use documentRoot, if set', async () => {
        const p = new project.Project('/path/to/proj', 'ionic.config.json');
        spyOn(p, 'load').and.callFake(() => Promise.resolve({ documentRoot: 'some/dir' }));
        expect(await p.getSourceDir()).toEqual('/path/to/proj/some/dir');
      });

      it('should be www for ionic1', async () => {
        const p = new project.Project('/path/to/proj', 'ionic.config.json');
        spyOn(p, 'load').and.callFake(() => Promise.resolve({ type: 'ionic1' }));
        expect(await p.getSourceDir()).toEqual('/path/to/proj/www');
      });

      it('should be src for ionic-angular', async () => {
        const p = new project.Project('/path/to/proj', 'ionic.config.json');
        spyOn(p, 'load').and.callFake(() => Promise.resolve({ type: 'ionic-angular' }));
        expect(await p.getSourceDir()).toEqual('/path/to/proj/src');
      });

    });

  });

});
