function transformCookies(jar) {
  return jar.map(function(c) {
    return c.key + '=' + encodeURIComponent(c.value);
  }).join('; ');
}

function retrieveCsrfToken(jar) {

  // console.log('retrieveCsrfToken', jar)
  if (!jar || typeof jar == 'undefined' || jar.length === 0) {

    // console.log('no jar folks')
    return '';
  }
  var csrftoken = '';
  for (var i = 0; i < jar.length; i += 1) {
    if (jar[i].key === 'csrftoken') {
      csrftoken = jar[i].value;
      break;
    }
  }
  return csrftoken;
}

function deleteFolderRecursive(removePath) {
  var fs = require('fs');
  var path = require('path');

  if (fs.existsSync(removePath)) {
    fs.readdirSync(removePath).forEach(function(file) {
      var curPath = path.join(removePath, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(removePath);
  }
}

module.exports = {
  deleteFolderRecursive: deleteFolderRecursive,
  retrieveCsrfToken: retrieveCsrfToken,
  transformCookies: transformCookies
};
