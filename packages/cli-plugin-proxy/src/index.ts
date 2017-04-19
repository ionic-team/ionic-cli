import * as superagentProxy from 'superagent-proxy';

import { load } from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';

const superagent = load('superagent');
superagentProxy(superagent);
