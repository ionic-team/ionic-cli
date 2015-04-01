var fs = require('fs'),
    path = require('path'),
    cl = console.log;



function crawlDocsCreateJson() {
  
  var docsJson = {
    versions: [],
    api: {}
  }

  var docsPath = path.resolve('docs');
  var docsApiPath = path.join(docsPath, 'api');

  var docsDirs = fs.readdirSync(docsPath);

  docsDirs.forEach(function(doc) {
    var isDocVersion = !isNaN(doc[0])
    if(isDocVersion) {
      docsJson.versions.push(doc)
    }
  })

  var apiDocsDirs = fs.readdirSync(docsApiPath);

  apiDocsDirs.forEach(function(docs) {
    console.log('docs:', docs);
    if(docs.indexOf('.md') != -1) {
      return
    }
    docsJson.api[docs] = {id: docs, docs: []};

    var apiDocPath = path.join(docsApiPath, docs)
    console.log('apiDocPath:', apiDocPath)

    var apiSubDocs = fs.readdirSync(apiDocPath)

    apiSubDocs.forEach(function(subdoc) {
      console.log('subdoc: ', subdoc)
      docsJson.api[docs].docs.push(subdoc);
    })
  })

  // cl('json:')
  // cl(docsJson)

  // cl(docsJson.api.controller.docs)
  // docsJson.api.controller.docs.forEach(function(e) {
  //   cl(e)
  // })

  cl(JSON.stringify(docsJson))

}


crawlDocsCreateJson();
