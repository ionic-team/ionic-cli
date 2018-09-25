import { generateUUID } from '../uuid';

describe('ionic', () => {

  describe('lib/utils/uuid', () => {

    describe('generateUUID', () => {

      it('should be of standard format', () => {
        const id = generateUUID();
        expect(id).toEqual(expect.stringMatching(/^[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}$/));
      });

    });

  });

});
