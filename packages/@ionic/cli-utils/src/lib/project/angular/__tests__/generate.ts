import { GENERATOR_TYPES, buildPathForGeneratorType } from '../generate';

describe('@ionic/cli-utils', () => {

  describe('lib/project/angular/generate', () => {

    describe('buildPathForGeneratorType', () => {

      it('should build flat path for simple generator types', () => {
        const simple = ['class', 'interface', 'enum'];

        for (const type of simple) {
          const result = buildPathForGeneratorType(type, 'foo');
          expect(result).toEqual('foo');
        }
      });

      it('should build path for complex generator types', () => {
        const complex = ['page', 'component', 'directive', 'service', 'pipe'];

        for (const type of complex) {
          const result = buildPathForGeneratorType(type, 'foo');
          expect(result).toEqual(`${type}s/foo`);
        }
      });

      it('should not modify name if it contains a slash', () => {
        const slashes = ['pages/tabs-page/tab1', 'custom/path/to/page'];

        for (const name of slashes) {
          const result = buildPathForGeneratorType('page', name);
          expect(result).toEqual(name);
        }
      });

    });

  });

});
