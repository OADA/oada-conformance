/* Copyright 2015 Open Ag Data Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var debug = require('debug')('oada-conformance:well-known');
var memoize = require('lodash').memoize;
var request = require('./request.js');

var config = require('../config.js').get('server');

function get(doc) {
    debug(config.uri + '/.well-known/' + doc);
    return request
        .get(config.uri + '/.well-known/' + doc)
        .accept('application/json')
        .promise()
        .get('body');
}

module.exports.get = memoize(get);
