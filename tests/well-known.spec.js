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

var Formats = require('oada-formats');
var formats = new Formats();
var packs = require('../config.js').get('options:oadaFormatsPackages') || [];
packs.forEach(function(pack) {
    formats.use(require(pack));
});

var test = require('./test');

var wellKnown = require('./well-known.js');
var config = require('../config.js').get('server');

test.describe('well-known documents', function(t) {
    t.test('oada-configuration', function(t) {
        return wellKnown.get('oada-configuration').then(function(res) {

            t.todo('has CORS enabled');

            return formats
                .model('application/vnd.oada.oada-configuration.1+json')
                .call('validate', res)
                .nodeify(function(err) {
                    t.error(err, 'matches schema');
                })
                .catch(function() {});
        });
    });

    t.test('openid-configuration', function(t) {
        return wellKnown.get('openid-configuration').then(function(res) {
            // TODO: Remove this test once others are implemented?
            t.ok(res, 'exists');

            t.todo('has CORS enabled');

            t.todo('is valid');
        });
    }, {skip: !config.openid});
});

