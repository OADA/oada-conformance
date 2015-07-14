'use strict';
/*
*  OAuth 2.0 Implicit Flow using supertest
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
// var jwt = require('jsonwebtoken');
// var fs = require('fs');
// var jws = require('jws-jwk').shim();
var utils = require('../../lib/utils.js');

var config = require('../../config.js').authorization;
var testOptions = require('../../config.js').options;
//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var state = {
	test : {}
};

var request = request.agent(config.uri);

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

      it('should respond with openid-configuration document', function(done){
        request
          .get('/.well-known/openid-configuration')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err,res){
            should.not.exist(err);
            // //Make sure it matches the prescribed format
            // assert.jsonSchema(JSON.parse(res.text),
            //                   require('./schema/openid_configuration.json'));
            //save the config doc for later use
            state.test['openid-configuration'] = JSON.parse(res.text);
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

describe('Obtaining token (implicit flow)', function(){
  describe('Logging in', function(){
  	    before(function (){
	    	//TODO: clear cookies

	  	});

	  	it('has a login dialog that can be automated', function(done){
	  		// bring up the 'login' dialog
		    // and parse its form format

		    var loginURL = state.test.
                           oadaConfiguration['authorization_endpoint'];
		    var path = utils.getRelativePath(config.uri,loginURL);

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
                    ' input[type=password],' +
                    'input[type=hidden],' +
                    'textarea').each(function(){

                    state.test.login['fields'].push($(this).attr('name'));
				});

				state.test.login['action'] = utils.getAbsoluteURI(config.uri,
                                                    currentURI,
                                                    formAction);
				//console.log(state.test.login['action'] )
		      	done();
		    });
	  	});



  		describe('Login with provided credential' , function(){
  			it('should save cookie', function(done){
	  			var postdata = {};
	  			//construct the post data from config
	  			for(var i in state.test.login.fields){
                    if (state.test.login.fields.hasOwnProperty(i)) {
    	  				var name = state.test.login.fields[i];
    	  				postdata[name] = config.loginFieldsValue[name];
                    }
	  			}

	  			state.stateVar = 'xyz';  //TODO: gen rand string

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
						done();
					});


	  		});

	  		it('should authorize', function(done){
	  			var parameters = {
					    	'response_type' : 'token',
					    	'client_id': config.goldClient['client_id'],
					    	'state' : state.stateVar,
					    	'redirect_uri': config.goldClient['redirect_uri'],
					    	'scope': 'bookmarks.fields'
				};

			    var authURL = utils.getRelativePath(config.uri,
                                    state.
                                    test.
                              oadaConfiguration['authorization_endpoint']);
			    	authURL += '/' + '?' + utils.getQueryString(parameters);


			    var req = request
			    		.get(authURL)
			    		.set('User-Agent',testOptions.userAgentValue)
			    		.type('form');

			    req.expect(200).end(function(err,res){
			    		should.not.exist(err, res.text);
			    		state.test['grantscreen'] = {'html': ''};
			    		state.test.grantscreen.html = res.text;
			    		done();
			    });
	  		});
  		});

  });


});


describe('Grant Screen and Obtaining access token', function(){
  		var $;
  		before(function(){
  			$ = cheerio.load(state.test.grantscreen.html);
  		});

  		it('should correctly displays all requested scopes', function(done){

  			//How should we decide whether all scopes are displayed
  			done();
  		});

  		it('should correctly displays trust level', function(done){

  		 	done();
  		});

  		it('should get access token', function(done){
  			//steal access code from query string

  			var data = {};

  			$('form input[type=text],'+
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
					var intercepted = utils.
                                      getQueryParameters(res.headers.location);
					intercepted.should.have.property('access_token');
					state.test['access_token'] = intercepted['access_token'];
					// //make sure states are equal
					assert.equal(state.stateVar, intercepted.state);

					done();
				});


  		});

});

/*
*  TODO: should also test that
*  OAuth in OAuth in OAuth thing
*/

describe('Obtain ID token', function(){
        var $;

        it('should authorize', function(done){
                var parameters = {
                    'response_type' : 'id_token',
                    'client_id': config.goldClient['client_id'],
                    'state' : 'xyz',
                    'redirect_uri': config.goldClient['redirect_uri'],
                    'scope': 'openid.profile'
                };
                //not sure which endpoint should this be
                var authURL = utils.getRelativePath(config.uri,
                               state.
                               test.
                               oadaConfiguration['authorization_endpoint']);
                    authURL += '/' + '?' + utils.getQueryString(parameters);

                var req = request
                        .get(authURL)
                        .set('User-Agent',testOptions.userAgentValue)
                        .type('form');

                req.expect(200).end(function(err,res){
                        should.not.exist(err, res.text);
                        $ = cheerio.load(res.text);
                        done();
                });
        });

        it('should get id token', function(done){

            var data = {};

            $('form input[type=text],' +
                ' input[type=password],' +
                ' input[type=hidden],' +
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
                    var intercepted = utils.
                                      getQueryParameters(res.headers.location);
                    intercepted.should.have.property('id_token');
                    state.test['id_token'] = intercepted['id_token'];
                    // //make sure states are equal
                    assert.equal(state.stateVar, intercepted.state);
                    //looks like its encrypted in JWT/JWS form?
                    console.log(state.test['id_token']);
                    done();
                });


        });

});


describe('Get User Info', function(){

    it('should not authorize', function(done){
                //not sure which endpoint should this be
                var userInfoURL = utils.getRelativePath(config.uri,
                    state.test['openid-configuration']['userinfo_endpoint']);

                var req = request
                        .get(userInfoURL)
                        .set('User-Agent',testOptions.userAgentValue)
                        .type('form');

                req.expect(200).end(function(err,res){
                        should.exist(err, res.text);
                        done();
                });
    });


});
