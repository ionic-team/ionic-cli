import * as cordova from '../cordova';

describe('resources', () => {
  it('filterArgumentsForCordova should return the command name and inputs if no options passed', () => {

    let metadata = {
      name: 'build',
      description: 'Build (prepare + compile) an Ionic project for a given platform.',
      inputs: [
        {
          name: 'platform',
          description: 'the platform that you would like to build'
        }
      ],
      options: [
        {
          name: 'nohooks',
          description: 'Do not add default Ionic hooks for Cordova',
          default: false,
          aliases: []
        }
      ]
    };
    let inputs = [
      'ios'
    ];
    let options = {
      nohooks: false
    };

    const result = cordova.filterArgumentsForCordova(metadata, inputs, options);
    expect(result).toEqual(['build', 'ios']);
  });

  it('filterArgumentsForCordova should include options if they are not on the ignored list', () => {

    let metadata = {
      name: 'build',
      description: 'Build (prepare + compile) an Ionic project for a given platform.',
      inputs: [
        {
          name: 'platform',
          description: 'the platform that you would like to build'
        }
      ],
      options: [
        {
          name: 'nohooks',
          description: 'Do not add default Ionic hooks for Cordova',
          default: false,
          aliases: []
        }
      ]
    };
    let inputs = [
      'ios'
    ];
    let options = {
      nohooks: true
    };

    const result = cordova.filterArgumentsForCordova(metadata, inputs, options);
    expect(result).toEqual(['build', 'ios']);
  });
});
