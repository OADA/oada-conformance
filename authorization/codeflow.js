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
var should = chai.should();
var cheerio = require('cheerio');
var fs = require('fs');
var utils = require('../utils.js');
var config = require('../config.js').authorization;
var testOptions = require('../config.js').options;
//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var state = {
    test : {}
    };

var request = request.agent(config.uri);

/**
*  Test Part 1 - Check that it can do OAuth
*/
describe('Check Pre-requisites', function(){
	describe('Exists .well_known/oada-configuration', function(){
	  before(function (){
	    state.test['well_known'] = {};
	  });

	  it('should respond with oada-configuration document', function(done){
	    request
	      .get('/.well-known/oada-configuration')
	      .set('Accept', 'application/json')
	      .expect('Content-Type', /json/)
	      .expect(200)
	      .end(function(err,res){
	      	should.not.exist(err);
	      	//Make sure it matches the prescribed format
	      	assert.jsonSchema(JSON.parse(res.text),
	      					  require('./schema/oada_configuration.json'));
	      	//save the config doc for later use
	      	state.test['oadaConfiguration'] = JSON.parse(res.text);

	      	done();
	      });
	  });

	});

	describe('Exists .well_known/oada-client-discovery', function(){

	  it('should respond with oada-client-discovery document', function(done){

	    request
	      .get('/.well-known/oada-client-discovery')
	      .set('Accept', 'application/json')
	      .expect('Content-Type', /json/)
	      .expect(200)
	      .end(function(err,res){
	      	should.not.exist(err, res.text);

	      	assert.jsonSchema(JSON.parse(res.text),
	      				      require('./schema/oada_client_discovery.json'));

	      	state.test['oada_client_discovery'] = JSON.parse(res.text);

	      	done();
	      });
	  });

	});
});

/*
 * Test begins after this point
*/

describe('access token in code flow', function(){
  describe('login dialog', function(){
	  	it('can login', function(done){

		    var loginURI = state.
                            test.
                            oadaConfiguration['authorization_endpoint'];

		    var path = utils.getRelativePath(config.uri,loginURI);

		    /* It may or may not redirect us.
		     1. if it redirects (302)
		       - assume the final redirected page is the login dialog
		     2. if it does not redirect
		       - assume this is the login dialog
			*/

		    request
		      .get(path)
		      .redirects(10)
		      .end(function(err,res){
		      	should.not.exist(err,res.text);
		      	state.test['login'] = {};
		      	var currentURI = config.uri + res.req.path;
		      	var $ = cheerio.load(res.text);
		      	//find out form action
				var formAction = $('form').attr('action');
				var formMethod = $('form').attr('method');

				//Make sure that this login form is doing POST
				assert.equal(formMethod.toLowerCase(), 'post');

				state.test.login['fields'] = [];
				$('form input[type=text],' +
                    'input[type=password],' +
                    ' input[type=hidden], textarea'
                  ).each(function(){

					state.test.login['fields'].push($(this).attr('name'));
				});

				state.test.login['action'] = utils.getAbsoluteURI(config.uri,
                    currentURI,
                    formAction);
		      	done();
		    });
	  	});

  		describe('Login with provided credential' , function(){

  			it('should reject bad credential', function(done){
	  			var postdata = {};
	  			//construct the post data from config
	  			for(var i in state.test.login.fields){
                    if (state.test.login.fields.hasOwnProperty(i)) {
    	  				var name = state.test.login.fields[i];
    	  				postdata[name] = 'x' + config.loginFieldsValue[name];
                    }
	  			}

	  			state.stateVariable = 'xyz';  //TODO: gen rand string

	  			//perform a login
				request
					.post(utils.getRelativePath(config.uri,
                        state.test.login['action']))
				    .type('form')
					.set('User-Agent',testOptions.userAgentValue)
				    .redirects(0)
					.send(postdata)
					.end(function(err, res){
						should.not.exist(err, res.text);
						//TODO: check that it rejects (somehow?)
						done();
					});


	  		});

  			it('should accept correct credential', function(done){
	  			var postdata = {};
	  			//construct the post data from config
	  			for(var i in state.test.login.fields){
                    if (state.test.login.fields.hasOwnProperty(i)) {
	  				   var name = state.test.login.fields[i];
	  				   postdata[name] = config.loginFieldsValue[name];
                    }
	  			}

	  			state.stateVariable = 'xyz';  //TODO: gen rand string

	  			//perform a login

				request
					.post(utils.
                        getRelativePath(config.uri,
                            state.test.login['action']))
				    .type('form')
					.set('User-Agent',
                        testOptions.userAgentValue)
				    .redirects(0)
					.send(postdata)
					.end(function(err, res){
						should.not.exist(err, res.text);
						done();
					});


	  		});

	  		it('should accept credential', function(done){
	  			var parameters = {
					    	'response_type' : 'code',
					    	'client_id': config.goldClient['client_id'],
					    	'state' : state.stateVariable,
					    	'redirect_uri': config.goldClient['redirect_uri'],
					    	'scope': 'bookmarks.fields openid'
				};

			    var aurl = utils.
                    getRelativePath(config.uri,
                    state.test.oadaConfiguration['authorization_endpoint']);
			    	aurl += '/' + '?' + utils.getQueryString(parameters);

			    var req = request
			    		.get(aurl)
			    		.set('User-Agent',testOptions.userAgentValue)
			    		.type('form');

			    req.expect(200)
			        .end(function(err,res){
			    		should.not.exist(err, res.text);
			    		state.test['grantscreen'] = {'html': ''}
			    		state.test.grantscreen.html = res.text;
			    		done();
			    	});
	  		});
  		});



  });

  describe('Grant Screen', function(){
  		var $;
  		before(function(){
  			$ = cheerio.load(state.test.grantscreen.html);
  		});

  		it('should correctly displays all requested scopes', function(done){

  			//How should we decide whether all scopes are displayed
  			done();
  		});

  		it('should receive access code from server', function(done){
  			//steal access code from query string

  			var data = {};

  			$('form input[type=text],' +
                'input[type=password],' +
                'input[type=hidden],' +
                ' textarea').each(function(){
				data[$(this).attr('name')] = $(this).attr('value');
			});

			var formAction = $('form').attr('action');
			var postURL = utils.getRelativePath(config.uri, formAction);

			request
				.post(postURL)
				.set('User-Agent',testOptions.userAgentValue)
				.type('form')
				.send(data)
				.redirects(0)
				.expect(302)
				.end(function(err, res){
					should.not.exist(err, res.text);
					//intercept the redirection
					var intercepted = utils.getQueryParameters(res.headers.location);
					intercepted.should.have.property('code');
					state.test['access_code'] = intercepted.code;
					//make sure states are equal
					assert.equal(state.stateVariable, intercepted.state);

					done();
				});


  		});

  });


  describe('Obtaining Access Token', function(){
  		var cert;
  		var secret;
  		var tokenEndpoint;

  		before(function(){
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



		it('should NOT exchange access code for bad request parameters', function(done){
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

			for(var p = 0; p < 32 ; p++){
				//get bit representation of p
				var bitstr = p.toString(2);
				//00001 means we will manipulate (invalidate) `client_secret` parameter
				//00010 means we will manipulate `client_id` .etc
				var badParams = JSON.parse(proto);
				for(var i = 0; i < bitstr.length; i++){
					if(bitstr[i] === '1'){
						//manipulate ith parameter of parameters
						var key = Object.keys(parameters)[i];
						badParams[key] = 'BAD1BAD' + bitstr;
					}
				}
				toggles.push(badParams);
			}

			var recurse = function(f){
				// If we have tested all possible
				// combination of bad request parameter
				// trigger done callback

				if(toggles.length === 0){
					done();
					return;
				}
				f();
			};

			var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

			var mkrequest = function(){
				request
					.post(postURL)
					.type('form')
					.set('User-Agent', testOptions.userAgentValue)
					.send(toggles.pop())
					.expect(200)
					.end(function(err, res){
			      		should.exist(err, res.text);
			      		recurse(mkrequest);
					});
			};

			mkrequest();

  		});

        it('should reject bad clientID', function(done){
            var parameters = {
                'grant_type': 'authorization_code',
                'code': state.test['access_code'],
                'redirect_uri': config.goldClient['redirect_uri'],
                'client_id': 'bad@example.com',
                'client_secret': secret
            };

            var postURL = utils.getRelativePath(config.uri, tokenEndpoint);

            request
                .post(postURL)
                .type('form')
                .set('User-Agent', testOptions.userAgentValue)
                .send(parameters)
                .expect(200)
                .end(function(err, res){
                    should.exist(err, res.text);
                    done();
                });
        });

  		it('should exchange access code for a token', function(done){
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
				.end(function(err, res){
		      		should.not.exist(err, res.text);
		      		state.test.tokenResponse = JSON.parse(res.text);
					done();
				});
  		});


  		it('should not exchange access code for a USED token', function(done){
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
				.end(function(err, res){
		      		should.exist(err, res.text);
					done();
				});
  		});



  		it('should verify that token is valid', function(done){
            console.log(state.test.tokenResponse);
  			state.test.tokenResponse.should.have.property('access_token');
  			state.test.tokenResponse.should.have.property('expires_in');
  		 	done();
  		});

  });

});


describe('Obtaining ID Token', function(){
        //Get app /.well-known/oada-configuration
        //user is authorized already
        //Get identity provider's /.well-known/openid-configuration
});

describe('Test logout', function(){

});
