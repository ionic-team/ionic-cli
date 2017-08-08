import { EventEmitter } from 'events';

import { ICLIEventEmitter } from '../definitions';

export class CLIEventEmitter extends EventEmitter implements ICLIEventEmitter {}
