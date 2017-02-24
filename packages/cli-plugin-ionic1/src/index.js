var IonicCli = require('./cli');

function run(envInstance) {
  return IonicCli.run(envInstance);
}

function getAllCommandMetadata() {
  var v1commands = IonicCli.getAllTaskSettings();

  return v1commands.map(cmd => {
    const options = Object.keys(cmd.options || []).map(key => {
      let [ long, short ] = key.replace(/-/g, '').split('|');
      let description = cmd.options[key];

      if (typeof cmd.options[key] !== 'string') {
        description = cmd.options[key].title;
      }

      return {
        name: long,
        description: description,
        aliases: short ? [short] : []
      }
    });
    const inputs = Object.keys(cmd.args || []).map(key => {
      return {
        name: key.replace(/[\[\]]/g, ''),
        description: cmd.args[key]
      };
    });
    return {
      name: cmd.name,
      description: cmd.summary,
      inputs: inputs,
      options: options
    }
  });
}

module.exports = {
  run: run,
  getAllCommandMetadata: getAllCommandMetadata
}
