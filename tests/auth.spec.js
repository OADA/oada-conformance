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

var _ = require('lodash');
var debug = require('debug')('oada-conformance:auth-tests');

var test = require('./test');

var config = require('../config.js').get('authorization');
var auth = require('./auth.js');
var metadata = require('../metadata.js');

var wellKnown = require('./well-known.js');

test.describe('auth', function(t) {
    return wellKnown.get('oada-configuration').then(function(oadaConfig) {

        // https://tools.ietf.org/html/rfc7591
        t.describe('oauth-dyn-reg (rfc7591)', function(t) {
            var endpoint = oadaConfig['registration_endpoint'];

            t.test('registation endpoint', function(t) {
                t.ok(endpoint, 'oada-configuration has registration_endpoint');
                //t.ok(is.url(endpoint), 'registration_endpoint is URL');
                t.is.url(endpoint,  'registration_endpoint is URL');
                t.end();
            });

            // https://tools.ietf.org/html/rfc7591#section-3.2.1
            // https://tools.ietf.org/html/rfc7591#section-2
            t.test('registering with valid metadata', function(t) {
                return auth._register(endpoint, metadata)
                    .then(function(res) {
                        t.equal(res.status, 201, 'responds 201 Created');
                        t.equal(res.type, 'application/json',
                               'responds with application/json');
                        // TODO: check schema
                        //expect(res.body).to.be.jsonSchema(metadataSchema);
                    });
            });

            // https://tools.ietf.org/html/rfc7591#section-3.2.2
            //TODO: Is this required?
            t.test('registering with invalid metadata', function(t) {
                return auth._register(endpoint, {})
                    .catch(_.identity)
                    .then(function(resp) {
                        t.equal(resp && resp.status, 400,
                                'respsonds 400 Bad Request');
                        // Check schema for error body?
                        t.ok(
                            resp && resp.body && resp.body.error,
                            'responds with OADA Error'
                        );
                    });
            });

            t.todo('should reject metadata with untrusted software_statement');
        });

        t.describe('OAuth 2.0', function(t) {
            var types = config.types;
            var regEndpoint = oadaConfig['registration_endpoint'];
            var endpoint = oadaConfig['authorization_endpoint'];
            var tokEndpoint = oadaConfig['token_endpoint'];

            // Get registered client data (Promise)
            var clientData = auth._register(regEndpoint, metadata).get('body');

            return clientData.then(function(clientData) {
                // Loop over login x type combinations
                var logins = Object.keys(config.logins);
                logins.forEach(function(login) {
                    types.forEach(function(type) {
                        var flow = type === 'code' ? 'code' : 'implicit';
                        t.describe('login: ' + login, function(t) {
                            t.describe('flow: ' + flow, function(t) {
                                genTokenTest(t, type, login);
                            });
                        });
                    });
                });

                function genTokenTest(t, type, login) {
                    var n = config.logins[login].fail ? 'not ' : '';
                    var fragOrQuery = type === 'code' ? 'query' : 'fragment';
                    var prop = type === 'token' ? 'access_token' : type;

                    t.describe('getting token', function(t) {
                        var resp;

                        t.test('does ' + n + 'give ' + type, function(t) {
                            var state = '1234';

                            var redir = auth._getRedirect(
                                endpoint,
                                type,
                                clientData,
                                login,
                                state
                            );

                            if (config.logins[login].fail) {
                                return redir.fromNode(function(err) {
                                    // TODO: More specific about error?
                                    t.ok(err, 'rejects invalid login');
                                });
                            } else {
                                return redir.get(fragOrQuery)
                                    .tap(debug)
                                    .then(function(params) {
                                        t.ok(
                                            params[prop],
                                            'responds with ' + type
                                        );

                                        resp = params[prop];
                                    });
                            }
                        });

                        if (!n) {
                            // conditional testing
                            t.codeTest = type === 'code' ? t.test : t.skip;
                            t.codeTest('gives token for code', function(t) {
                                var token = auth._getToken(
                                    tokEndpoint,
                                    clientData,
                                    resp
                                );

                                return token.get('body')
                                    .tap(debug)
                                    .then(function(token) {
                                        // TODO: Token schema?
                                        var hasTok = token &&
                                                token['access_token'] &&
                                                token['token_type'];
                                        t.ok(hasTok,
                                                'responds with access token');
                                    });
                            });

                            // TODO: switch below todos to codeTest
                            t.todo('should only redeem code once');
                            t.todo('should invalidate token when code reused');
                        }
                    });

                    if (!config.logins[login].fail) {
                        t.test('returns state when given', function(t) {
                            var state = '1234';

                            var redir = auth._getRedirect(
                                endpoint,
                                type,
                                clientData,
                                login,
                                state
                            );

                            return redir.tap(debug).get(fragOrQuery)
                                .tap(debug)
                                .then(function(params) {
                                    t.equal(params.state, state,
                                            'returned state equals sent state');
                                });
                        });

                        /* TODO: Require this?
                        it('should work when state not given', function() {
                            var redir = auth._getRedirect(
                                endpoint,
                                type,
                                clientData,
                                login
                            );

                            return redir.get(fragOrQuery)
                                .tap(debug)
                                .then(function(params) {
                                    assert.property(params, prop,
                                            'should receieve ' + prop);
                                });
                        });
                        */
                    }

                    t.describe('error responses', function(t) {
                        // https://tools.ietf.org/html/rfc7523#section-3.1

                        // http://tools.ietf.org/html/rfc6749#section-4.1.2.1
                        // http://tools.ietf.org/html/rfc6749#section-4.2.2.1
                        // TODO: Should this test run?
                        t.skip('invalid client_id response', function(t) {
                            var state = '1234';
                            var data = Object.assign({}, clientData);
                            // Make client_id wrong
                            data['client_id'] += 'foo';

                            var redir = auth._getRedirect(
                                endpoint,
                                type,
                                data,
                                login,
                                state
                            );

                            return redir
                                .catch(_.identity)
                                .get(fragOrQuery)
                                .then(function(err) {
                                    var ERR_CODES = [
                                        'invalid_request',
                                        'unauthorized_client',
                                        'access_denied',
                                        'unsupported_response_type',
                                        'invalid_scope',
                                        'server_error',
                                        'temporarily_unavailable'
                                    ];

                                    // TODO: Schema?
                                    t.includes(ERR_CODES, err.error,
                                            'error field is an allowed code');
                                    t.deepEqual(err.state, state,
                                            'returned state equals sent state');
                                });
                        });

                        // conditional testing
                        t.codeTest = type === 'code' ? t.test : t.skip;
                        // TODO: Check more than just wrong code
                        // http://tools.ietf.org/html/rfc6749#section-5.2
                        t.codeTest('invalid code response', function(t) {
                            var state = '1234';
                            var redir = auth._getRedirect(
                                endpoint,
                                type,
                                clientData,
                                login,
                                state
                            );

                            return redir
                                .get('query')
                                .get('code')
                                .then(function(code) {
                                    return auth._getToken(
                                            tokEndpoint,
                                            clientData,
                                            code + 'foo'
                                    );
                                })
                                .catch(_.identity)
                                .then(function(res) {
                                    var ERR_CODES = [
                                        'invalid_request',
                                        'invalid_client',
                                        'invalid_grant',
                                        'unauthorized_client',
                                        'unsupported_grant_type',
                                        'invalid_scope'
                                    ];

                                    t.equal(res && res.status, 400,
                                            'respsonds 400 Bad Request');

                                    // TODO: Schema?
                                    t.includes(
                                        ERR_CODES,
                                        res && res.body && res.body.error,
                                        'error field is an allowed code'
                                    );
                                });
                        });
                    });
                }
            });
        });
    });
});
