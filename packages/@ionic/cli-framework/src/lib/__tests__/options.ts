import * as minimist from 'minimist';

import {
  OptionFilters,
  filterCommandLineOptions,
  filterCommandLineOptionsByGroup,
  metadataToParseArgsOptions,
  parsedArgsToArgv,
} from '../options';

describe('@ionic/cli-framework', () => {

  describe('lib/options', () => {

    const metadata1 = {
      name: 'bar',
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
          groups: ['a'],
        },
        {
          name: 'bar',
          description: '',
          default: 'soup',
          groups: ['b'],
        },
        {
          name: 'flag1',
          description: '',
          type: Boolean,
        },
      ],
    };

    describe('metadataToParseArgsOptions', () => {

      it('should transform metadata to minimist options', () => {
        const result = metadataToParseArgsOptions(metadata1);
        expect(result).toEqual({
          string: ['_', 'foo', 'bar'],
          boolean: ['flag1'],
          alias: { foo: ['f'], bar: [], flag1: [] },
          default: { foo: null, bar: 'soup', flag1: false },
        });
      });

      describe('minimist arg parse', () => {

        it('should parse with empty argv', () => {
          const opts = metadataToParseArgsOptions(metadata1);
          const result = minimist([], opts);
          expect(result).toEqual({ _: [], foo: null, f: null, bar: 'soup', flag1: false, });
        });

        it('should parse with comprehensive argv', () => {
          const opts = metadataToParseArgsOptions(metadata1);
          const result = minimist(['cat', '--foo', 'rabbit', 'dog', '--bar=salad', '--unknown', 'wow', '--flag1', 'extra', '--and-again'], opts);
          expect(result).toEqual({ _: ['cat', 'dog', 'extra'], foo: 'rabbit', f: 'rabbit', bar: 'salad', flag1: true, unknown: 'wow', 'and-again': true });
        });

      });

    });

    describe('parsedArgsToArgv', () => {

      it('should handle empty argv', () => {
        const result = parsedArgsToArgv({ _: [] });
        expect(result).toEqual([]);
      });

      it('should filter out arguments', () => {
        const result = parsedArgsToArgv({ _: ['foo', 'bar'] });
        expect(result).toEqual([]);
      });

      it('should parse out boolean option from minimist result', () => {
        const result = parsedArgsToArgv({ _: ['foo', 'bar'], wow: true });
        expect(result).toEqual(['--wow']);
      });

      it('should parse out string option from minimist result', () => {
        const result = parsedArgsToArgv({ _: [], cat: 'meow' });
        expect(result).toEqual(['--cat=meow']);
      });

      it('should parse out option list from minimist result', () => {
        const result = parsedArgsToArgv({ _: [], cat: 'meow', dog: 'bark', flag1: true });
        expect(result).toEqual(['--cat=meow', '--dog=bark', '--flag1']);
      });

      it('should parse out option list from minimist result without equal signs', () => {
        const result = parsedArgsToArgv({ _: [], cat: 'meow', dog: 'bark', flag1: true }, { useEquals: false });
        expect(result).toEqual(['--cat', 'meow', '--dog', 'bark', '--flag1']);
      });

      it('should parse out string option from minimist result and not wrap strings with spaces in double quotes without flag', () => {
        const result = parsedArgsToArgv({ _: [], cat: 'meow meow meow' });
        expect(result).toEqual(['--cat=meow meow meow']);
      });

      it('should parse out string option from minimist result and wrap strings with spaces in double quotes with flag provided', () => {
        const result = parsedArgsToArgv({ _: [], cat: 'meow meow meow' }, { useDoubleQuotes: true });
        expect(result).toEqual(['--cat="meow meow meow"']);
      });

    });

    describe('filterCommandLineOptions', () => {

      it('should return empty object for empty input', () => {
        const result = filterCommandLineOptions(metadata1, { _: [] });
        expect(result).toEqual({ _: [] });
      });

      it('should return args if supplied', () => {
        const result = filterCommandLineOptions(metadata1, { _: ['a', 'b'] }, opt => true);
        expect(result).toEqual({ _: ['a', 'b'] });
      });

      it('should include all known & supplied options using a true predicate', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], foo: 'hi', flag1: true }, opt => true);
        expect(result).toEqual({ _: [], foo: 'hi', flag1: true });
      });

      it('should include all known & supplied options without a predicate', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], foo: 'hi', flag1: true });
        expect(result).toEqual({ _: [], foo: 'hi', flag1: true });
      });

      it('should include options with aliases', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], f: 'hi', flag1: true });
        expect(result).toEqual({ _: [], foo: 'hi', flag1: true });
      });

      it('should return empty object for a false predicate', () => {
        const result = filterCommandLineOptions(metadata1, { _: [] }, opt => false);
        expect(result).toEqual({ _: [] });
      });

      it('should exclude unknown options even with a true predicate', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], unknown: 'yep', bar: 'hi', flag1: true }, opt => true);
        expect(result).toEqual({ _: [], bar: 'hi', flag1: true });
      });

      it('should exclude options that do not match the predicate using opt', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], unknown: 'yep', foo: 'wow', bar: 'hi', flag1: true }, opt => opt.groups && opt.groups.includes('a'));
        expect(result).toEqual({ _: [], foo: 'wow' });
      });

      it('should exclude options that do not match the predicate using value', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], unknown: 'yep', foo: 'wow', bar: 'hi', flag1: true }, (opt, value) => value === 'hi');
        expect(result).toEqual({ _: [], bar: 'hi' });
      });

      it('should include separated args from original parsed args', () => {
        const result = filterCommandLineOptions(metadata1, { _: [], '--': 'some more --args' });
        expect(result).toEqual({ _: [], '--': 'some more --args' });
      });

      describe('OptionFilters.includesGroups', () => {

        it('should include single group', () => {
          const result = filterCommandLineOptions(metadata1, { _: [], foo: 'wow', bar: 'nope', flag1: true }, OptionFilters.includesGroups('a'));
          expect(result).toEqual({ _: [], foo: 'wow' });
        });

        it('should include multiple groups', () => {
          const result = filterCommandLineOptions(metadata1, { _: [], foo: 'wow', bar: 'nope', flag1: true }, OptionFilters.includesGroups(['a', 'b']));
          expect(result).toEqual({ _: [], foo: 'wow', bar: 'nope' });
        });

      });

      describe('OptionFilters.excludesGroups', () => {

        it('should exclude single groups', () => {
          const result = filterCommandLineOptions(metadata1, { _: [], foo: 'wow', bar: 'nope', flag1: true }, OptionFilters.excludesGroups('a'));
          expect(result).toEqual({ _: [], bar: 'nope', flag1: true });
        });

        it('should exclude multiple groups', () => {
          const result = filterCommandLineOptions(metadata1, { _: [], foo: 'wow', bar: 'nope', flag1: true }, OptionFilters.excludesGroups(['a', 'b']));
          expect(result).toEqual({ _: [], flag1: true });
        });

      });

    });

    describe('filterCommandLineOptionsByGroup', () => {

      it('should exclude options not in group a', () => {
        const result = filterCommandLineOptionsByGroup(metadata1, { _: [], unknown: 'yep', foo: 'wow', bar: 'hi', flag1: true }, 'a');
        expect(result).toEqual({ _: [], foo: 'wow' });
      });

      it('should exclude options not in group a or b', () => {
        const result = filterCommandLineOptionsByGroup(metadata1, { _: [], unknown: 'yep', foo: 'wow', bar: 'hi', flag1: true }, ['a', 'b']);
        expect(result).toEqual({ _: [], foo: 'wow', bar: 'hi' });
      });

    });

  });

});
