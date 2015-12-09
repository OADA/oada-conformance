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

var request = require('superagent-bluebird-promise');
var methods = require('methods');
var _ = require('lodash');

var options = require('../config.js').get('options');

function setup(req) {
    req = req.set('User-Agent', options.userAgent);

    if (options.origin) {
        req = req.set('Origin', options.origin);
    }

    return req;
}

_.forEach(methods, function(method) {
    method = method === 'delete' ? 'del' : method;

    var fun = request[method];

    request[method] = function() {
        var req = fun.apply(request, arguments);

        return setup(req);
    };
});

request.Error = request.SuperagentPromiseError;

module.exports = request;
