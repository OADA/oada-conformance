'use strict';

/*
*  OAuth 2.0 Code Flow
*  Tests ability to get access token
*  Tests ability to get ID token
*
*/
var request = require('supertest');
var chai = require('chai');
chai.use(require('chai-json-schema'));
//var cheerio = require('cheerio');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var debug = require('debug')('tests:auth:code');

var utils = require('../../lib/utils.js');
//var phantomUtils = require('../../lib/phantom-utils.js');
var config = require('../../config.js').authorization;
var testOptions = require('../../config.js').options;
var autoLogin = require('../../lib/autoLogin.js');

var metadata = require('../../metadata');

var oadaConfigSchema = require('./schema/oada_configuration.json');
var metadataSchema = require('./schema/register.json');

var KEY_ACCESS_TOKEN = 'access_token';

//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var state = {
    test : {}
};

var request = request.agent(config.uri);

describe('Check Pre-requisites', function() {

    describe('Exists .well_known/oada-configuration', function() {
        before(function() {
            state.test['well_known'] = {};
        });

        it('should respond with oada-configuration document', function(done) {
            request
                .get('/.well-known/oada-configuration')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) { done(err); }

                    //Make sure it matches the prescribed format
                    expect(JSON.parse(res.text))
                        .to.be.jsonSchema(oadaConfigSchema);
                    //save the config doc for later use
                    state.test.oadaConfiguration = JSON.parse(res.text);

                    done();
                });
        });
    });

    describe('Registration', function() {

        it('supports dynamic client registration', function(done) {
            var postTo = utils.getRelativePath(
                    config.uri,
                    state.test.oadaConfiguration['registration_endpoint']);
            request
                .post(postTo)
                .send(metadata)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function(err, res) {
                    if (err) { done(err); }

                    //check schema
                    state.test.clientInfo = JSON.parse(res.text);
                    expect(state.test.clientInfo)
                        .to.be.jsonSchema(metadataSchema);

                    debug(state.test.clientInfo);

                    done();
                });
        });
    });
});

/*
 * Test begins after this point
*/

describe('get access token in code flow process', function() {
    this.timeout(60000);

    it('upon login, responds with access code', function(done) {
        state.stateVariable = 'LLL0';
        var parameters = {
            'response_type' : 'code',
            'client_id': state.test.clientInfo['client_id'],
            'state' : state.stateVariable,
            'redirect_uri': state.test.clientInfo['redirect_uris'][0],
            'scope': 'bookmarks.machines',
            'prompt': 'consent'
        };

        var aurl = state.test.oadaConfiguration['authorization_endpoint'];
        aurl += '/' + '?' + utils.getQueryString(parameters);

        autoLogin(aurl, config.loginActions, function(err, url) {
            expect(err).to.be.not.ok;

            debug(url);

            var intercepted = utils.getQueryParameters(url);
            expect(intercepted).to.have.property('code');
            state.test['access_code'] = intercepted.code;

            done();
        });
    });
});

describe('Exchanging Access Token Step', function() {
    var cert;
    var secret;
    var tokenEndpoint;

    this.timeout(60000);

    before(function() {
        tokenEndpoint = state.test.oadaConfiguration['token_endpoint'];
        cert = fs.readFileSync(path.join(__dirname, 'certs/private.pem'));
        secret = utils.generateClientSecret(
                cert,
                state.test.clientInfo['client_id'],
                tokenEndpoint,
                state.test['access_code'],
                config.goldClient['key_id']
        );
    });

    it('should reject bad clientID', function(done) {
        var parameters = {
            'grant_type': 'authorization_code',
            'code': state.test['access_code'],
            'redirect_uri': config.goldClient['redirect_uri'],
            'client_id': 'hello@world.com',
            'client_secret': secret
        };

        var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

        request
            .post(postURL)
            .type('form')
            .set('User-Agent', testOptions.userAgentValue)
            .send(parameters)
            .end(function(err, res) {
                if (err) { done(err); }

                try {
                    expect(JSON.parse(res.text))
                        .to.not.have.property(KEY_ACCESS_TOKEN);
                } catch (ex) {}

                done();
            });
    });

    it('should reject bad parameters', function(done) {
        //try wrong parameter
        var parameters = {
            'grant_type': 'authorization_code',
            'code': state.test['access_code'] + 'x',
            'redirect_uri': config.goldClient['redirect_uri'],
            'client_id': config.goldClient['client_id'],
            'client_secret': secret
        };

        var proto = JSON.stringify(parameters);
        var toggles = [ ];

        for (var p = 0; p < 32 ; p++) {
            //get bit representation of p
            var bitstr = p.toString(2);
            //00001 means we will manipulate
            //   (invalidate) `client_secret` parameter
            //00010 means we will manipulate `client_id` .etc
            var badParams = JSON.parse(proto);
            for (var i = 0; i < bitstr.length; i++) {
                if (bitstr[i] === '1') {
                    //manipulate ith parameter of parameters
                    var key = Object.keys(parameters)[i];
                    badParams[key] = 'BAD1BAD' + bitstr;
                }
            }
            toggles.push(badParams);
        }

        var recurse = function(f) {
            // If we have tested all possible
            // combination of bad request parameter
            // trigger done callback

            if (toggles.length === 0) {
                done();
                return;
            }
            f();
        };

        var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

        var mkrequest = function() {
            request
                .post(postURL)
                .type('form')
                .set('User-Agent', testOptions.userAgentValue)
                .send(toggles.pop())
                .end(function(err, res) {
                    if (err) { done(err); }

                    try {
                        expect(JSON.parse(res.text))
                            .to.not.have.property(KEY_ACCESS_TOKEN);
                    } catch (ex) {
                        //okay
                    }
                    recurse(mkrequest);
                });
        };

        mkrequest();
    });

    it('should succeed', function(done) {
        var parameters = {
            'grant_type': 'authorization_code',
            'code': state.test['access_code'],
            'redirect_uri': state.test.clientInfo['redirect_uris'][0],
            'client_id': state.test.clientInfo['client_id'],
            'client_secret': secret
        };

        var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

        request
            .post(postURL)
            .type('form')
            .set('User-Agent', testOptions.userAgentValue)
            .send(parameters)
            .expect(200)
            .end(function(err, res) {
                if (err) { done(err); }

                state.test.tokenResponse = JSON.parse(res.text);
                expect(state.test.tokenResponse)
                    .to.have.property(KEY_ACCESS_TOKEN);
                /*
                console.log('ACTOKEN: ',
                        state.test.tokenResponse[KEY_ACCESS_TOKEN])
                */
                done();
            });
    });

    it('should fail when reusing access code', function(done) {
        if (state.test.tokenResponse[KEY_ACCESS_TOKEN] === undefined) {
            this.skip();
        }
        var parameters = {
            'grant_type': 'authorization_code',
            'code': state.test['access_code'],
            'redirect_uri': config.goldClient['redirect_uri'],
            'client_id': config.goldClient['client_id'],
            'client_secret': secret
        };

        var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

        request
            .post(postURL)
            .type('form')
            .set('User-Agent', testOptions.userAgentValue)
            .send(parameters)
            .end(function(err, res) {
                if (err) { done(err); }

                var tryJSON = JSON.parse(res.text);
                expect(tryJSON).to.not.have.property(KEY_ACCESS_TOKEN);

                done();
            });
    });
});

//  it('should reject bad parameters', function(done) {
//      //try wrong parameter
//      var parameters = {
//          'grant_type': 'authorization_code',
//          'code': state.test['access_code'] + 'x',
//          'redirect_uri': config.goldClient['redirect_uri'],
//          'client_id': config.goldClient['client_id'],
//          'client_secret': secret
//      };

//      var proto = JSON.stringify(parameters);
//      var toggles = [ ];

//      for (var p = 0; p < 32 ; p++) {
//          //get bit representation of p
//          var bitstr = p.toString(2);
//          //00001 means we will manipulate
//          //   (invalidate) `client_secret` parameter
//          //00010 means we will manipulate `client_id` .etc
//          var badParams = JSON.parse(proto);
//          for (var i = 0; i < bitstr.length; i++) {
//              if (bitstr[i] === '1') {
//                  //manipulate ith parameter of parameters
//                  var key = Object.keys(parameters)[i];
//                  badParams[key] = 'BAD1BAD' + bitstr;
//              }
//          }
//          toggles.push(badParams);
//      }

//      var recurse = function(f) {
//          // If we have tested all possible
//          // combination of bad request parameter
//          // trigger done callback

//          if (toggles.length === 0) {
//              done();
//              return;
//          }
//          f();
//      };

//      var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

//      var mkrequest = function() {
//          request
//              .post(postURL)
//              .type('form')
//              .set('User-Agent', testOptions.userAgentValue)
//              .send(toggles.pop())
//              .expect(200)
//              .end(function(err, res) {
//                  should.exist(err, res.text);
//                  recurse(mkrequest);
//              });
//      };

//      mkrequest();

//  });

//  it('should exchange access code for a token', function(done) {
//      var parameters = {
//          'grant_type': 'authorization_code',
//          'code': state.test['access_code'],
//          'redirect_uri': config.goldClient['redirect_uri'],
//          'client_id': config.goldClient['client_id'],
//          'client_secret': secret
//      };

//      var postURL = utils.getRelativePath(config.uri, tokenEndpoint);
//      request
//          .post(postURL)
//          .type('form')
//          .set('User-Agent', testOptions.userAgentValue)
//          .send(parameters)
//          .expect(200)
//          .end(function(err, res) {
//              should.not.exist(err, res.text);
//              state.test.tokenResponse = JSON.parse(res.text);
//              done();
//          });
//  });

//  it('should not exchange access code for a USED token', function(done) {
//      var parameters = {
//          'grant_type': 'authorization_code',
//          'code': state.test['access_code'],
//          'redirect_uri': config.goldClient['redirect_uri'],
//          'client_id': config.goldClient['client_id'],
//          'client_secret': secret
//      };

//      var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

//      request
//          .post(postURL)
//          .type('form')
//          .set('User-Agent', testOptions.userAgentValue)
//          .send(parameters)
//          .expect(200)
//          .end(function(err, res) {
//              should.exist(err, res.text);
//              done();
//          });
//  });

//  it('should verify that token is valid', function(done) {
//      console.log(state.test.tokenResponse);
//      state.test.tokenResponse.should.have.property('access_token');
//      state.test.tokenResponse.should.have.property('expires_in');
//      done();
//  });

//});

//});

//describe('Obtaining ID Token', function() {
//  //Get app /.well-known/oada-configuration
//  //user is authorized already
//  //Get identity provider's /.well-known/openid-configuration
//});

//describe('Test logout', function() {

//});
