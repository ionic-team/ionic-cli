var execSync = require('child_process').execSync

var previousGlobalConfig = process.env.npm_config_global;
process.env.npm_config_global = 'false';

var cmd = 'npm rebuild node-sass spawn-sync';
cmd += process.platform === 'darwin' ? ' fsevents' : '';

execSync(cmd, {stdio: [0,1,2]});
process.env.npm_config_global = previousGlobalConfig;

