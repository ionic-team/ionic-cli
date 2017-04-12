const fs = require('fs');
const path = require('path');
const cliUtils = require(`../packages/cli-utils/dist/index.js`);
const pluginName = process.argv[2];
const plugin = require(`../packages/${pluginName}/dist/index.js`);

const STRIP_ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const fileList = plugin.namespace.getCommandMetadataList().map((cmd) => {
  cmd.fullName = (plugin.PLUGIN_NAME) ? `${plugin.namespace.name}:${cmd.name}` : cmd.name;

  const output = formatCommandDoc(cmd).replace(STRIP_ANSI_REGEX, '');
  const fileName = (plugin.namespace.name) ? `${plugin.namespace.name}-${cmd.name}` : cmd.name;
  fs.writeFileSync(path.resolve(__dirname, '..', 'docs', `${fileName}.md`), output);

  return {
    commandName: cmd.fullName,
    description: cmd.description,
    fileName
  }
});

const output = formatPluginDocs(pluginName, fileList);
fs.writeFileSync(path.resolve(__dirname, '..', 'docs', `${pluginName}.md`), output);



function formatPluginDocs(pluginName, listFileCommands) {
  let headerLine = `# ${pluginName}`;

  function listCommandLink (cmdData) {
    return `[${cmdData.commandName}](${cmdData.fileName}.md) | ${cmdData.description}`;
  }

  return `
${headerLine}

Command | Description
------- | -----------
${listFileCommands.map(listCommandLink).join(`
`)}
`
}


function formatCommandDoc(cmdMetadata) {
  let description = cmdMetadata.description.split('\n').join('\n  ');

  return formatName(cmdMetadata.fullName, description) +
    formatSynopsis(cmdMetadata.inputs, cmdMetadata.fullName) +
    formatDescription(cmdMetadata.inputs, cmdMetadata.options, description) +
    formatExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

function formatName(fullName, description) {
  const headerLine = `## NAME`;
  return `
${headerLine}
${fullName} -- ${description}
  `;
}

function formatSynopsis(inputs, commandName) {
  const headerLine = `## SYNOPSIS`;
  const usageLine =
      `ionic ${commandName} ${
        (inputs || [])
          .map(input => {
            if (input.validators && input.validators.includes(cliUtils.validators.required)) {
              return '<' + input.name + '>';
            }
            return '[' + input.name + ']';
          })
          .join(' ')}`;

  return `
${headerLine}
    ${usageLine}
  `;
}


function formatDescription(inputs = [], options = [], description = '') {
  const headerLine = `## DESCRIPTION`;

  function inputLineFn(input, index) {
    const name = input.name;
    const description = input.description;
    const optionList = `\`${name}\``;

    return `${optionList} | ${description}`;
  };

  function optionLineFn(option) {
    const name = option.name;
    const aliases = option.aliases;
    const description = option.description;

    const optionList = `\`--${name}\`` +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map((alias) => `\`-${alias}\``)
         .join(', ') : '');

    return `${optionList} | ${description}`;
  };


  return `
${headerLine}
${description}

${inputs.length > 0 ? `
Input | Description
----- | ----------` : ``}
${inputs.map(inputLineFn).join(`
`)}

${options.length > 0 ? `
Option | Description
------ | ----------` : ``}
${options.map(optionLineFn).join(`
`)}
`
}

function formatExamples(exampleCommands, commandName) {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const headerLine = `## EXAMPLES`;
  const exampleLines = exampleCommands.map(cmd => `ionic ${commandName} ${cmd} `);

  return `
${headerLine}
    ${exampleLines.join(`
    `)}
`
}
