import { CommandData } from '../../../definitions';
import { filterOptionsByIntent } from '../utils';

describe('@ionic/cli-utils filterOptionsByIntent', () => {
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
