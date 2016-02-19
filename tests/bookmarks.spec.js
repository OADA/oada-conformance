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
var crypto = require('crypto');
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

        t.test('is valid', function(t) {
            var bookmarks = resources.get('bookmarks', token);

            return formats
                .model('application/vnd.oada.bookmarks.1+json')
                .call('validate', bookmarks.get('body'))
                .nodeify(function(err) {
                    t.error(err, 'matches schema');
                })
                .catch(function() {});

        });

        // TODO: Is this required? Maybe the previous test handles this?
        t.todo('is a resource', function(t) {
            var bookmarks = resources.get('bookmarks', token).get('body');
            var id = bookmarks.get('_id');

            return id
                .tap(function(id) {
                    t.ok(id, '/bookmarks has an `_id` field');
                })
                .tap(function(id) {
                    var resource = resources.get(id, token).get('body');

                    return Promise.join(bookmarks, resource,
                        function(bookmarks, resource) {
                            t.deepEqual(resource, bookmarks,
                                '/bookmarks equals corresponding resource');
                        });
                });
        });

        // TODO: Rewrite to run tests as documents are retrieved
        // currently gets *all* documents and then tests them
        t.test('has valid subdocuments', function(t) {
            return resources.getAll('bookmarks', token, function(id, res) {
                t.notEqual(res.body, undefined, 'has a body: ' + id);

                if (res.body && res.body._id) {
                    // TODO: _meta schema?
                    t.ok(res.body._meta, 'has a _meta: ' + id);
                    t.ok(res.body._meta._metaid, 'has a _metaid: ' + id);

                    var skip = false;
                    return formats
                        .model(res.type)
                        .call('validate', res.body)
                        .catch(Formats.MediaTypeNotFoundError, function(e) {
                            debug('Model for ' + e.message + ' not found');
                            skip = e.message;
                        })
                        .nodeify(function(err) {
                            t.error(err, 'matches schema: ' + id, {
                                skip: skip
                            });
                        })
                        .catch(function() {});
                    /* TODO: Fails because of rev. How to handle?
                        .then(function() {
                            return resources.get(res.body._id, token);
                        })
                        .get('body')
                        .nodeify(function(err, body) {
                            t.deepEqual(res.body, body,
                                    'matches /resources doc: ' + id);
                        })
                        .catch(function() {});
                    */
                }
            });
        });

        t.todo('has CORS enabled');
    });
});

test.describe('error responses', function(t) {
    return auth.getAuth(config.login).then(function(token) {
        t.test('GET with bad token', function(t) {
            return resources.get('bookmarks', token + 'foo')
                .catch(function(err) { return err; })
                .then(function(res) {
                    t.equal(res.status, 401, 'responds 401 Unathorized');
                    t.todo('check OADA error'); // TODO: OADA error schema?
                });
        });

        t.test('GET on non-existent resource', function(t) {
            var bytes = Promise.fromNode(function(done) {
                return crypto.randomBytes(16, done);
            });

            return resources.get(bytes.call('toString', 'hex'), token)
                .catch(function(err) { return err; })
                .then(function(res) {
                    // TODO: Does the status code matter?
                    t.is.within(res.status, 399, 500, 'responds with 4xx code');
                    //t.equal(res.status, 404, 'responds 404 Not Found');
                    t.todo('check OADA error'); // TODO: OADA error schema?
                });
        });
    });
});
