import * as minimist from 'minimist';
import { CommandData } from '../../../definitions';
import { metadataToMinimistOptions, filterOptionsByIntent } from '../utils';

describe('@ionic/cli-utils', () => {

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
        string: ['foo', 'bar'],
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
