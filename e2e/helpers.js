/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    os = require('os');

module.exports.tmpDir = function(subdir) {
    var dir = path.join(os.tmpdir(), 'e2e-test');
    if (subdir) {
        dir = path.join(dir, subdir);
    }
    shell.mkdir('-p', dir);
    return dir;
};

// Returns the platform that should be used for testing on this host platform.
/*
var host = os.platform();
if (host.match(/win/)) {
    module.exports.testPlatform = 'wp8';
} else if (host.match(/darwin/)) {
    module.exports.testPlatform = 'ios';
} else {
    module.exports.testPlatform = 'android';
}
*/

// Just use Android everywhere; we're mocking out any calls to the `android` binary.
module.exports.testPlatform = 'android';

// Add the toExist matcher.
beforeEach(function() {
    this.addMatchers({
        'toExist': function() {
            var notText = this.isNot ? ' not' : '';
            var self = this;

            this.message = function() {
                return 'Expected file ' + self.actual + notText + ' to exist.';
            };

            return fs.existsSync(this.actual);
        }
    });
});

