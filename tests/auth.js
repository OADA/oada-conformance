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

/*
var chai = require('chai');
var expect = chai.expect;
*/

var Promise = require('bluebird');
var _ = require('lodash');
var request = require('superagent-bluebird-promise');
var URI = require('URIjs');
var debug = require('debug')('oada-conformance:auth');

var clientAuth = require('jwt-bearer-client-auth');

//TODO: Use oada-formats?
//chai.use(require('chai-json-schema'));
//var metadataSchema = require('./schema/register.json');
var keys = require('../certs');
var config = require('../config.js').authorization;
var options = require('../config.js').options || {};

var autoLogin = require('../lib/autoLogin.js');
autoLogin.USER_AGENT =
    options.userAgent || 'OADA-Conformance-Tests/1.1 (mocha; node-js)';

// Do ouath-dyn-reg
var register = _.memoize(function register(endpoint, metadata) {
    debug('Using client metadata:');
    debug(metadata);

    return request
        .post(endpoint)
        .type('application/json')
        .accept('application/json')
        .send(metadata)
        .promise();
});
module.exports._register = register;

// Get access code
function getRedirect(endpoint, type, clientData, authId, state) {
    return Promise.try(function() {
        var login = config.logins[authId];

        var query = {
            'response_type': type,
            'client_id': clientData['client_id'],
            'scope': login.scopes.join(' '),
            'state': state,
            // TODO: How to handle multiple redirect_uris?
            'redirect_uri': clientData['redirect_uris'][0],
        };

        // Construct URl
        var uri = new URI(endpoint);
        uri.query(query);

        return autoLogin(uri.toString(), login.actions)
            .then(URI.parse)
            .then(function(obj) {
                obj.query = URI.parseQuery(obj.query);
                obj.fragment = URI.parseQuery(obj.fragment);

                obj.toString = function() {
                    var uri = new URI(this);

                    uri.query(this.query);

                    return uri.toString();
                };

                return obj;
            });
    });
}
module.exports._getRedirect = getRedirect;

// Exchange access code for access token
function getToken(endpoint, clientData, code) {
    return Promise.try(function() {
        var assertion = clientAuth.generate(
            keys.priv,
            clientData['client_id'],
            clientData['client_id'],
            endpoint,
            60,
            {payload: {jti: code}}
        );
        var query = {
            'grant_type': 'authorization_code',
            // TODO: How to handle multiple redirect_uris?
            'redirect_uri': clientData['redirect_uris'][0],
            'client_assertion': assertion,
            'client_assertion_type':
                'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            'client_id': clientData['client_id'],
            'code': code
        };

        return request.post(endpoint)
            .type('form')
            .send(query)
            .promise();
    });
}
module.exports._getToken = getToken;

/* NYI
// Only really runs once
// TODO: Support hardcoded token
module.exports.getAuth = _.memoize(function getAuth(authNum) {
    var clientMetadata = register(metadata);
    getcode();
    getToken();
});


// Keep track of conformance requirements
var criteria = {
    didDynReg: undefined
};
module.exports.criteria = criteria;
*/
