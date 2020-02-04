import * as path from 'path';

import { ProjectType } from './definitions';

export const ASSETS_DIRECTORY = path.resolve(__dirname, 'assets');

export const PROJECT_FILE = process.env['IONIC_CONFIG_FILE'] ?? 'ionic.config.json';
export const PROJECT_TYPES: ProjectType[] = ['angular', 'ionic-angular', 'ionic1', 'custom', 'react', 'vue'];
