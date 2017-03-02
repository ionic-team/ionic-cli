import * as path from 'path';

import { buildCordovaConfig, CordovaProject } from '../utils/cordova-config';

/**
 * Main Lab app view
 */
export function LabAppView(req: any, res: any) {
  return res.sendFile('index.html', {
    root: path.join(__dirname, '..', '..', 'lab')
  });
}

export function ApiCordovaProject(req: any, res: any) {
  buildCordovaConfig((err: any) => {
    res.status(400).json({
      status: 'error',
      message: 'Unable to load config.xml'
    });
  }, (config: CordovaProject) => {
    res.json(config);
  });
}
