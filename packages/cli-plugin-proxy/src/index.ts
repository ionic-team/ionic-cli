import * as superagentProxy from 'superagent-proxy';

import { load } from '@ionic/cli-utils';

const superagent = load('superagent');
superagentProxy(superagent);
