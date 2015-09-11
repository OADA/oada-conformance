'use strict';

var chai = require('chai');
var expect = chai.expect;

var config = require('../config.js').authorization;
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
        before('need registration_endpoint', function() {
            this.regEndpoint = this.oadaConfig['registration_endpoint'];
            expect(this.regEndpoint).to.be.a('string');
        });

        before('need authorization endpoint', function() {
            this.endpoint = this.oadaConfig['authorization_endpoint'];
            expect(this.endpoint).to.be.a('string');
        });

        before('need registered client data', function() {
            var self = this;
            return auth._register(this.regEndpoint, metadata)
                .get('body')
                .then(function(clientData) {
                    self.clientData = clientData;
                });
        });

        var logins = Object.keys(config.logins);
        logins.forEach(function(login) {
            // TODO: Problay unroll this loop
            var n = config.logins[login].fail ? 'not ' : '';
            ['code', 'token', 'id_token'].forEach(function(type) {
                var fragOrQuery = type === 'code' ? 'query' : 'fragment';
                var prop = type === 'token' ? 'access_token' : type;
                it('should ' + n + 'give ' + type + ' for ' + login,
                    function() {
                        var state = '1234';

                        var redir = auth._getRedirect(
                            this.endpoint,
                            type,
                            this.clientData,
                            login,
                            state
                        );

                        if (config.logins[login].fail) {
                            return redir.catch(function(err) {
                                // TODO: More specific about error?
                                expect(err).to.be.ok;
                            });
                        } else {
                            return redir.then(function(redir) {
                                expect(redir[fragOrQuery])
                                    .to.have.property(prop);
                            });
                        }
                    }
                );
            });
        });
    });

    /*
    it('should get code', getCode);
    it('should fail to get token second time', function() {
        expect(getToken()).to.not.throw(Error);
        expect(getToken()).to.throw(Error);
    })
    */
});
