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

var Promise = require('bluebird');
var debug = require('debug')('oada-conformance:bookmarks.spec');

var test = require('./test');

var auth = require('./auth.js');
var resources = require('./resources.js');
var config = require('../config.js').get('bookmarks');

var Formats = require('oada-formats');
var formats = new Formats();
var packs = require('../config.js').get('options:oadaFormatsPackages') || [];
packs.forEach(function(pack) {
    formats.use(require(pack));
});

test.describe('bookmarks', function(t) {
    // Have to get token corrensponding to config.login user
    return auth.getAuth(config.login).then(function(token) {

        t.test('should be valid', function(st) {
            var bookmarks = resources.get('bookmarks', token);

            return formats
                .model('application/vnd.oada.bookmarks.1+json')
                .call('validate', bookmarks.get('body'))
                .then(function() {
                    st.pass('/bookmarks valid');
                });

        });

        // TODO: Is this required? Maybe the previous test handles this?
        t.todo('should be a resource', function(st) {
            var bookmarks = resources.get('bookmarks', token).get('body');
            var id = bookmarks.get('_id');

            return id
                .tap(function(id) {
                    st.ok(id, '/bookmarks has an `_id` field');
                })
                .tap(function(id) {
                    var resource = resources.get(id, token).get('body');

                    return Promise.join(bookmarks, resource,
                        function(bookmarks, resource) {
                            st.deepEqual(resource, bookmarks,
                                '/bookmarks equals corresponding resource');
                        });
                });
        });

        // TODO: Rewrite to run tests as documents are retrieved
        // currently gets *all* documents and then tests them
        t.test('should support getting subdocuments', function(st) {
            //var SUB_TIMEOUT = 100; // Add to timeout for each subdocument?
            //var self = this;

            return resources.getAll('bookmarks', token, function(id, res) {
                // TODO: Check schema?
                st.notEqual(res.body, undefined, 'has a body: ' + id);

                // Increase timeout
                //self.timeout(self.timeout() + SUB_TIMEOUT);

                // Only validate resources at their root
                /*
                var cLocation = res.res.headers['content-location'];
                if (cLocation &&
                        cLocation.match(/^.*\/resources\/[^\/]+\/?$/) &&
                */
                if (res.body && res.body._id) {
                    var err;
                    var skip = false;
                    return formats
                        .model(res.type)
                        .call('validate', res.body)
                        .catch(Formats.ValidationError, function(e) {
                            // TODO: I think this is the wrong way to do it...
                            err = e;
                        })
                        .catch(Formats.MediaTypeNotFoundError, function(e) {
                            debug('Model for ' + e.message + ' not found');
                            skip = e.message;
                        })
                        .then(function() {
                            st.error(err, 'matches schema: ' + id, {
                                skip: skip
                            });
                        });
                }
            });
        });

        t.todo('should have CORS enabled');
    });
});
