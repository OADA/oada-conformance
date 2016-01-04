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
var util = require('util');
var _ = require('lodash');
var request = require('./request.js');
var URI = require('urijs');
var debug = require('debug')('oada-conformance:resources');

var expect = require('chai').expect;

var wellKnown = require('./well-known.js');

function GetNotAllowedError(err) {
    Error.call(this);
    this.message = 'GET not ALLOWed by URI';
    this.error = err;
}
util.inherits(GetNotAllowedError, Error);

// Get a resource
var get = _.memoize(function get(id, token) {
    var uri = wellKnown.get('oada-configuration')
        .get('oada_base_uri')
        .tap(function(uri) {
            expect(uri).to.be.a('string', 'need oada_base_uri');
        })
        .then(URI);

    return Promise.join(uri, id, token,
        function constructResourceUri(uri, id, token) {
            switch (id.toString().toLowerCase().split('/', 1)[0]) {
                case 'bookmarks':
                case 'resources':
                case 'meta':
                    uri.path(uri.path() + id);
                    break;
                default:
                    // Assume it is a resource id
                    uri.path(uri.path() + 'resources/' + id);
            }

            return request.get(uri.toString())
                .set('Authorization', token)
                .promise()
                .catch(function(err) {
                    return (err instanceof request.Error) &&
                        (err.status === 405) &&
                        (err.res.header.Allow && err.res.header.Allow
                            .toUpperCase.split(', ').indexOf('GET') === -1);
                }, function(err) {
                    debug('GET not allowed by URI: ' + uri);
                    throw new GetNotAllowedError(err);
                });
        });
});

// Get a resource and all subdocuments
function getAll(id, token, subDocCb) {
    var ids = [];
    subDocCb = subDocCb || _.noop;

    return _getAll(id);

    function _getAll(id) {
        var res = get(id, token).tap(function(res) {
            // Call callback on each subdocument
            return subDocCb(id, res);
        });

        return res
            // TODO: How to handle a 204 with content???
            .tap(function(res) {
                if (res.status === 204) {
                    expect(res.body).to
                        .equal(undefined, '204 Response should have no body');
                }
            })
            .get('body')
            .then(function getSubDocs(res) {
                // Find already retrieved subdocuments
                // TODO: Should this only check for cyles instead?
                var _id = res && res._id;

                debug('Got resource: ' + id || '');
                debug(res);

                if (_id !== undefined && _.includes(ids, _id)) {
                    debug('Found _id: ' + _id + ' thorugh multiple parents');
                    return {};
                } else {
                    ids.push(_id);
                }

                expect(res).to.not.equal(undefined);

                // Don't get subparts of strings
                if (typeof res === 'string') {
                    return {};
                }

                return _.map(res, function(val, key) {
                    return _getAll(id + '/' + key);
                });
            }).props()
            .return(res)
            .catch(GetNotAllowedError, _.noop);
    }
}

module.exports.get = get;
module.exports.getAll = getAll;

