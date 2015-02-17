var transformCookies = function transformCookies(jar) {
  return jar.map(function(c) {
    return c.key + "=" + encodeURIComponent(c.value);
  }).join("; ");
}

var retrieveCsrfToken = function retrieveCsrfToken(jar) {
  // console.log('retrieveCsrfToken', jar)
  if(!jar || typeof jar == 'undefined' || jar.length == 0) {
    // console.log('no jar folks')
    return '';
  }
  var csrftoken = '';
  for (var i = 0; i < jar.length; i++) {
    if (jar[i].key == 'csrftoken') {
      csrftoken = jar[i].value;
      break;
    }
  }
  return csrftoken;
}


module.exports = {
  retrieveCsrfToken: retrieveCsrfToken,
  transformCookies: transformCookies
}
