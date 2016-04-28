var path = require('path');
var ionicAppLib = require('ionic-app-lib');
var Info = ionicAppLib.info;

function InfoTask() {}

InfoTask.prototype.run = function(ionic) {
  this.ionic = ionic;

  try {

    var info = Info.gatherInfo();

    Info.getIonicVersion(info, process.cwd());
    Info.getIonicCliVersion(info, path.join(__dirname, '../../'));

    Info.printInfo(info);

    Info.checkRuntime();
  } catch (ex) {
    this.ionic.fail('There was an error retrieving your environment information:', ex);
  }
};

exports.IonicTask = InfoTask;
