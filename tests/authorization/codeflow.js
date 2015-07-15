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
var assert = chai.assert;
// TODO: Handle jshint browser stuff better?
var phantom = require('phantom'); /* jshint browser: true, jquery: true */
//var should = chai.should();
//var cheerio = require('cheerio');
var fs = require('fs');

var utils = require('../../lib/utils.js');
//var phantomUtils = require('../../lib/phantom-utils.js');
var config = require('../../config.js').authorization;
var testOptions = require('../../config.js').options;

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
                    assert.jsonSchema(JSON.parse(res.text),
                            require('./schema/oada_configuration.json'));
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
                .send() // TOD: Send valid client metadata
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) { done(err); }

                    //check schema
                    state.test.clientInfo = JSON.parse(res.text);
                    assert.jsonSchema(state.test.clientInfo,
                            require('./schema/register.json'));

                    done();
                });
        });
    });
});

/*
 * Test begins after this point
*/

describe('get access token in code flow process', function() {
    var _page;
    var _ph;
    this.timeout(60000);

    it('presents login form', function(done) {
        state.stateVariable = 'LLL0';
        var parameters = {
            'response_type' : 'code',
            'client_id': config.goldClient['client_id'],
            'state' : state.stateVariable,
            'redirect_uri': config.goldClient['redirect_uri'],
            'scope': 'bookmarks.machines',
            'prompt': 'consent'
        };

        var aurl = config.uri + '/auth';
        aurl += '/' + '?' + utils.getQueryString(parameters);

        phantom.create(function(ph) {
            _ph = ph;
            ph.createPage(function(page) {
                _page = page;
                page.open(aurl, function(status) {
                    assert.equal(status, 'success');

                    page.render('screen0.png');
                    page.evaluate(function(formConfig) {
                        for (var key in formConfig.fields) {
                            if (formConfig.fields.hasOwnProperty(key)) {
                                var value = formConfig.fields[key];
                                var ielems = document.querySelectorAll(key);
                                for (var k in ielems) {
                                    if (ielems.hasOwnProperty(k)) {
                                        var element = ielems[k];
                                        element.value = value;
                                    }
                                }
                            }
                        }

                        var buttons =
                            document.querySelectorAll(formConfig.successClick);
                        buttons[0].click();
                    }, function() {
                        //wait for page transition
                        setTimeout(function() {
                            done();
                        }, 1000);
                        //ph.exit();

                    }, config.automation.shift());
                });
            });
        });
    });

    it('presents scope form', function(done) {
        _page.render('screen1.png');
        _page.set('onUrlChanged', function(url) {
            //TODO: seems hacky and unreliable
            //how many redirection will OAuth do
            //Expect a redirection
            var intercepted = utils.
            getQueryParameters(url);
            intercepted.should.have.property('code');
            state.test['access_code'] = intercepted.code;

            done();
        });

        _page.evaluate(function(formConfig) {

            for (var index in formConfig.clicks) {
                if (formConfig.clicks.hasOwnProperty(index)) {
                    var value = formConfig.clicks[index];
                    $(value).click();
                }
            }

            $(formConfig.successClick).click();

        }, function() {
            setTimeout(function() {
                _ph.exit();
            }, 2000);
        }, config.automation.shift());
    });
});

describe('Exchanging Access Token Step', function() {
    var cert;
    var secret;
    var tokenEndpoint;

    this.timeout(60000);

    before(function() {
        tokenEndpoint = state.test.oadaConfiguration['token_endpoint'];
        cert = fs.readFileSync('certs/private.pem');
        secret = utils.generateClientSecret(
                cert,
                config.goldClient['client_id'],
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
                    JSON.parse(res.text)
                        .should.not.have.property(KEY_ACCESS_TOKEN);
                } catch (ex) {
                    done();
                }
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
                        JSON.parse(res.text)
                            .should.not.have.property(KEY_ACCESS_TOKEN);
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
            .expect(200)
            .end(function(err, res) {
                if (err) { done(err); }

                state.test.tokenResponse = JSON.parse(res.text);
                state.test.tokenResponse.should.have.property(KEY_ACCESS_TOKEN);
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
                tryJSON.should.not.have.property(KEY_ACCESS_TOKEN);
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
