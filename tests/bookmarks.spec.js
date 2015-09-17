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
var expect = require('chai').expect;

var auth = require('./auth.js');
var resources = require('./resources.js');
var config = require('../config.js').get('bookmarks');

describe('bookmarks', function() {
    before('need token for login ' + config.login, function() {
        var self = this;

        return auth.getAuth(config.login).then(function(token) {
            self.token = token;
        });
    });

    it('should exist', function() {
        // TODO: Check schema?
        var bookmarks = resources.get('bookmarks', this.token);

        return bookmarks.get('body');
    });

    it('should be a resource', function() {
        var bookmarks = resources.get('bookmarks', this.token).get('body');
        var id = bookmarks.get('_id');
        var resource = resources.get(id, this.token).get('body');

        return Promise.join(bookmarks, resource, function(bookmarks, resource) {
            expect(resource).to.deep.equal(bookmarks);
        });
    });

    it('should support getting subdocuments', function() {
        return resources.getAll('bookmarks', this.token);
    });

    xit('should have CORS enabled');
});

