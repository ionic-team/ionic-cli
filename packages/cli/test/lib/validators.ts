import * as chalk from 'chalk';
import test from 'ava';

import { validators } from '../../src/lib/validators';

test('required validator', t => {
  const r1 = validators.required('');
  t.true(typeof r1 === 'string' && r1 === 'Must not be empty.');
  const r2 = validators.required('', 'my_key');
  t.true(typeof r2 === 'string' && chalk.stripColor(r2) === 'my_key must not be empty.');
  const r3 = validators.required('value!');
  t.true(typeof r3 === 'boolean' && r3);
});

test('email validator', t => {
  const r1 = validators.email('');
  t.true(typeof r1 === 'string' && r1 === 'Invalid email address.');
  const r2 = validators.email('', 'my_key');
  t.true(typeof r2 === 'string' && chalk.stripColor(r2) === 'my_key is an invalid email address.');
  const r3 = validators.email('asdf')
  t.true(typeof r3 === 'string' && r3 === 'Invalid email address.');
  const r4 = validators.email('foo@foo')
  t.true(typeof r4 === 'string' && r4 === 'Invalid email address.');
  const r5 = validators.email('a@b.c')
  t.true(typeof r5 === 'boolean' && r5);
});
