import * as minimist from 'minimist';

import { CommandData } from '../../../definitions';
import { filterOptionsByIntent, metadataToMinimistOptions, minimistOptionsToArray } from '../command';

describe('@ionic/cli-utils', () => {

  describe('minimistOptionsToArray', () => {

    it('should handle empty argv', () => {
      const result = minimistOptionsToArray({ _: [] });
      expect(result).toEqual([]);
    });

    it('should filter out arguments', () => {
      const result = minimistOptionsToArray({ _: ['foo', 'bar'] });
      expect(result).toEqual([]);
    });

    it('should parse out boolean option from minimist result', () => {
      const result = minimistOptionsToArray({ _: ['foo', 'bar'], wow: true });
      expect(result).toEqual(['--wow']);
    });

    it('should parse out string option from minimist result', () => {
      const result = minimistOptionsToArray({ _: [], cat: 'meow' });
      expect(result).toEqual(['--cat=meow']);
    });

    it('should parse out option list from minimist result', () => {
      const result = minimistOptionsToArray({ _: [], cat: 'meow', dog: 'bark', flag1: true });
      expect(result).toEqual(['--cat=meow', '--dog=bark', '--flag1']);
    });

    it('should parse out option list from minimist result without equal signs', () => {
      const result = minimistOptionsToArray({ _: [], cat: 'meow', dog: 'bark', flag1: true }, { useEquals: false });
      expect(result).toEqual(['--cat', 'meow', '--dog', 'bark', '--flag1']);
    });

    it('should parse out string option from minimist result and not wrap strings with spaces in double quotes without flag', () => {
      const result = minimistOptionsToArray({ _: [], cat: 'meow meow meow' });
      expect(result).toEqual(['--cat=meow meow meow']);
    });

    it('should parse out string option from minimist result and wrap strings with spaces in double quotes with flag provided', () => {
      const result = minimistOptionsToArray({ _: [], cat: 'meow meow meow' }, { useDoubleQuotes: true });
      expect(result).toEqual(['--cat="meow meow meow"']);
    });

  });

  describe('metadataToMinimistOptions', () => {

    const metadata: CommandData = {
      inputs: [
        {
          name: 'input1',
          description: '',
        },
        {
          name: 'input2',
          description: '',
        },
      ],
      options: [
        {
          name: 'foo',
          description: '',
          aliases: ['f'],
        },
        {
          name: 'bar',
          description: '',
          default: 'soup',
        },
        {
          name: 'flag1',
          description: '',
          type: Boolean,
        },
      ],
    };

    it('should transform metadata to minimist options', () => {
      const result = metadataToMinimistOptions(metadata);
      expect(result).toEqual({
        string: ['_', 'foo', 'bar'],
        boolean: ['flag1'],
        alias: { foo: ['f'], bar: [], flag1: [] },
        default: { foo: null, bar: 'soup', flag1: false },
      });
    });

    describe('minimist arg parse', () => {

      it('should parse with empty argv', () => {
        const opts = metadataToMinimistOptions(metadata);
        const result = minimist([], opts);
        expect(result).toEqual({ _: [], foo: null, f: null, bar: 'soup', flag1: false, });
      });

      it('should parse with comprehensive argv', () => {
        const opts = metadataToMinimistOptions(metadata);
        const result = minimist(['cat', '--foo', 'rabbit', 'dog', '--bar=salad', '--unknown', 'wow', '--flag1', 'extra', '--and-again'], opts);
        expect(result).toEqual({ _: ['cat', 'dog', 'extra'], foo: 'rabbit', f: 'rabbit', bar: 'salad', flag1: true, unknown: 'wow', 'and-again': true });
      });

    });

  });

  describe('filterOptionsByIntent', () => {

    const metadata: CommandData = {
      description: '',
      inputs: [
        {
          name: 'input1',
          description: '',
        },
      ],
      options: [
        {
          name: 'foo',
          description: '',
          intent: 'foobar',
        },
        {
          name: 'bar',
          description: '',
          intent: 'foobar',
        },
        {
          name: 'baz',
          description: '',
          intent: 'baz',
        },
        {
          name: 'intentless',
          description: '',
        },
      ],
    };

    const givenOptions = { foo: 'a', bar: 'b', baz: 'c', intentless: 'nope' };

    it('should only return options with no intent with no intent supplied', () => {
      const results = filterOptionsByIntent(metadata, givenOptions);
      const { foo, bar, baz, ...expected } = givenOptions;
      expect(results).toEqual(expected);
    });

    it('should only return options that match the intent supplied', () => {
      const results = filterOptionsByIntent(metadata, givenOptions, 'foobar');
      const { baz, intentless, ...expected } = givenOptions;
      expect(results).toEqual(expected);
    });

    it('should return no options with a bogus intent supplied', () => {
      const results = filterOptionsByIntent(metadata, givenOptions, 'literally bogus');
      const expected = {};
      expect(results).toEqual(expected);
    });

  });

});
