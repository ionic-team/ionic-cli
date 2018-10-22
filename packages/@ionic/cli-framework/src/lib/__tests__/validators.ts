import { contains, validators } from '../validators';

import stripAnsi = require('strip-ansi');

describe('@ionic/cli-framework', () => {

  describe('lib/validators', () => {

    describe('validators', () => {

      describe('required', () => {

        it('should return a generic message if the input is not given', () => {
          const result = validators.required();
          expect(result).toEqual('Must not be empty.');
        });

        it('should return a generic message if the input is an empty string', () => {
          const result = validators.required('');
          expect(result).toEqual('Must not be empty.');
        });

        it('should return a name-specific message if the input is not given and a name is provided', () => {
          const result = validators.required(undefined, 'my_key');
          expect(stripAnsi(result as any)).toEqual('my_key must not be empty.');
        });

        it('should return a name-specific message if the input is an empty string and a name is provided', () => {
          const result = validators.required('', 'my_key');
          expect(stripAnsi(result as any)).toEqual('my_key must not be empty.');
        });

        it('should validate falsy input', () => {
          const falsy = ['0', 'false'];

          for (const v of falsy) {
            const result = validators.required(v);
            expect(result).toBe(true);
          }
        });

        it('should validate input', () => {
          const result = validators.required('some input');
          expect(result).toBe(true);
        });

      });

      describe('email', () => {

        it('should return a generic message if the email is an empty string', () => {
          const result = validators.email('');
          expect(result).toEqual('Invalid email address.');
        });

        it('should return a name-specific message if the email is empty and a name is provided', () => {
          const result = validators.email('', 'my_key');
          expect(stripAnsi(result as any)).toEqual('my_key is an invalid email address.');
        });

        it('should return a string if email address is invalid', () => {
          const r3 = validators.email('asdf');
          const r4 = validators.email('foo@foo');
          expect(stripAnsi(r3 as any)).toEqual('Invalid email address.');
          expect(stripAnsi(r4 as any)).toEqual('Invalid email address.');
        });

        it('should validate an email', () => {
          const result = validators.email('a@b.c');
          expect(result).toBe(true);
        });

      });

      // TODO: url
      // TODO: numeric

      describe('slug', () => {

        it('should return a generic message if the slug is invalid', () => {
          const result = validators.slug('A');
          expect(result).toEqual('Invalid slug (machine name).');
        });

        it('should return a name-specific message if the slug is invalid and a name is provided', () => {
          const result = validators.slug('A', 'my_key');
          expect(stripAnsi(result as any)).toEqual('my_key is an invalid slug (machine name).');
        });

        it('should validate a slug', () => {
          const result = validators.slug('a-b-c');
          expect(result).toBe(true);
        });

      });

    });

    describe('contains', () => {

      it('should generate a validator that handles input not given', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator();
        expect(stripAnsi(result as any)).toEqual('Must be one of: foo, bar, baz (not unset)');
      });

      it('should generate a validator that handles input not given with the given key', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator(undefined, 'my_key');
        expect(stripAnsi(result as any)).toEqual('my_key must be one of: foo, bar, baz (not unset)');
      });

      it('should generate a validator that handles input not in collection', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator('my input');
        expect(stripAnsi(result as any)).toEqual('Must be one of: foo, bar, baz (not my input)');
      });

      it('should generate a validator that handles input not in collection with the given key', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator('my input', 'my_key');
        expect(stripAnsi(result as any)).toEqual('my_key must be one of: foo, bar, baz (not my input)');
      });

      it('should generate a validator that handles empty input', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator('');
        expect(stripAnsi(result as any)).toEqual('Must be one of: foo, bar, baz (not empty)');
      });

      it('should generate a validator that handles empty input with the given key', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator('', 'my_key');
        expect(stripAnsi(result as any)).toEqual('my_key must be one of: foo, bar, baz (not empty)');
      });

      it('should generate a validator that handles empty input in collection that allows unset input', () => {
        const validator = contains(['foo', 'bar', 'baz', undefined], {});
        const result = validator('');
        expect(stripAnsi(result as any)).toEqual('Must be unset or one of: foo, bar, baz (not empty)');
      });

      it('should generate a validator that handles empty input in collection that allows unset input with the given key', () => {
        const validator = contains(['foo', 'bar', 'baz', undefined], {});
        const result = validator('', 'my_key');
        expect(stripAnsi(result as any)).toEqual('my_key must be unset or one of: foo, bar, baz (not empty)');
      });

      it('should generate a validator that validates input in the collection', () => {
        const validator = contains(['foo', 'bar', 'baz'], {});
        const result = validator('foo');
        expect(stripAnsi(result as any)).toBe(true);
      });

      it('should generate a validator that validates input that is not given', () => {
        const validator = contains(['foo', 'bar', 'baz', undefined], {});
        const result = validator();
        expect(stripAnsi(result as any)).toBe(true);
      });

    });

  });

});
