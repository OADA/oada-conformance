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

var chai = require('chai');
var expect = chai.expect;

var _ = require('lodash');
var debug = require('debug')('oada-conformance:auth-tests');

var config = require('../config.js').get('authorization');
var auth = require('./auth.js');
var metadata = require('../metadata.js');

var wellKnown = require('./well-known.js');

describe('auth', function() {
    before('need oada-configuration', function() {
        var self = this;
        return wellKnown.get('oada-configuration')
            .then(function(oadaConfig) {
                self.oadaConfig = oadaConfig;
            });
    });

    describe('oauth-dyn-reg', function() {
        before('need registration_endpoint', function() {
            this.endpoint = this.oadaConfig['registration_endpoint'];
            expect(this.endpoint).to.be.a('string');
        });

        it('should support registering with valid metadata', function() {
            return auth._register(this.endpoint, metadata).then(function(res) {
                expect(res.status).to.equal(201);
                //check schema
                //expect(res.body).to.be.jsonSchema(metadataSchema);
            });
        });

        //TODO: Is this required?
        it('should reject invalid metadata', function() {
            return auth._register(this.endpoint, {}).catch(function(err) {
                expect(err.status).to.equal(400);
                // Check schema for error body?
                expect(err.body.error).to.be.ok;
            });
            /*
            return expect(auth._register(REG_ENDPOINT, {}))
                .to.eventually.be.rejectedWith('got 400');
            */
        });

        xit('should reject metadata with untrusted software_statement');
    });

    describe('getting token', function() {
        var types = config.types;

        before('need registration_endpoint', function() {
            this.regEndpoint = this.oadaConfig['registration_endpoint'];
            expect(this.regEndpoint).to.be.a('string');
        });

        before('need authorization endpoint', function() {
            this.endpoint = this.oadaConfig['authorization_endpoint'];
            expect(this.endpoint).to.be.a('string');
        });

        if (types.indexOf('code') >= 0) {
            before('need token endpoint', function() {
                this.tokEndpoint = this.oadaConfig['token_endpoint'];
                expect(this.tokEndpoint).to.be.a('string');
            });
        }

        before('need registered client data', function() {
            var self = this;
            return auth._register(this.regEndpoint, metadata)
                .get('body')
                .then(function(clientData) {
                    self.clientData = clientData;
                });
        });

        // Loop over login x type combinations
        var logins = Object.keys(config.logins);
        _.forEach(logins, function(login) {
            describe('login: ' + login, function() {
                _.forEach(types, function(type) {
                    genTokenTest(type, login);
                });
            });
        });

        function genTokenTest(type, login) {
            var n = config.logins[login].fail ? 'not ' : '';
            var fragOrQuery = type === 'code' ? 'query' : 'fragment';
            var prop = type === 'token' ? 'access_token' : type;

            // step doesn't work with Promises...
            step('should ' + n + 'give ' + type, function(done) {
                var state = '1234';
                var self = this;

                var redir = auth._getRedirect(
                    this.endpoint,
                    type,
                    this.clientData,
                    login,
                    state
                );

                var p;
                if (config.logins[login].fail) {
                    p = redir.catch(function(err) {
                        // TODO: More specific about error?
                        expect(err).to.be.ok;
                    });
                } else {
                    p = redir.get(fragOrQuery)
                        .tap(debug)
                        .then(function(params) {
                            expect(params).to.have.property(prop);
                            expect(params.state).to.equal(state);

                            self[prop] = params[prop];
                        });
                }

                return p.nodeify(done);
            });

            if (!n && type === 'code') {
                step('should given token for code', function(done) {
                    var token = auth._getToken(
                        this.tokEndpoint,
                        this.clientData,
                        this.code
                    );

                    return token.get('body')
                        .tap(debug)
                        .then(function(token) {
                            // TODO: Token schema?
                            expect(token)
                                .to.include.keys('access_token', 'token_type');
                        })
                        .nodeify(done);
                });

                xstep('should only redeem code once');

                xstep('should invalidate token when code reused');

            }

            // http://self-issued.info/docs/
            //      draft-ietf-oauth-jwt-bearer.html#GrantProcessing
            // http://tools.ietf.org/html/rfc6749#section-5.2
            xstep('should have correct error response');
        }
    });
});
