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
var test_options = require('../config.js').options;
//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var global = {
	test : {}
}

var request = request.agent(config.uri);

/**
*  Test Part 1 - Check that it can do OAuth 
*/

describe('Check Pre-requisites', function(){
	describe('Exists .well_known/oada-configuration', function(){
	  before(function (){
	    global.test['well_known'] = {}
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
	      					  require("./schema/oada_configuration.json"));
	      	//save the config doc for later use
	      	global.test["oada_configuration"] = JSON.parse(res.text);

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
	      				      require("./schema/oada_client_discovery.json"));

	      	global.test["oada_client_discovery"] = JSON.parse(res.text);

	      	done();
	      });
	  });

	});
});


/**
*
*  Part 2 - try getting the token
*
*/


describe('Obtaining a token in code flow', function(){
  describe('Logging in', function(){
  	    before(function (){
	    	//TODO: clear cookies

	  	});

	  	it('has a login dialog that can be automated', function(done){
	  		// bring up the "login" dialog 
		    // and parse its form format

		    var login_uri = global.test.oada_configuration.authorization_endpoint;
		    var path = utils.getRelativePath(config.uri,login_uri);

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
		      	global.test["login"] = {};
		      	var current_uri = config.uri + res.req.path;
		      	$ = cheerio.load(res.text);
		      	//find out form action
				var form_action = $("form").attr("action");
				var form_method = $("form").attr("method");

				//Make sure that this login form is doing POST
				assert.equal(form_method.toLowerCase(), "post");
				
				global.test.login["fields"] = []
				$("form input[type=text], input[type=password], input[type=hidden], textarea").each(function(m,t){
					global.test.login["fields"].push($(this).attr("name"));
				});

				global.test.login["action"] = utils.getAbsoluteURI(config.uri, current_uri, form_action);
				//console.log(global.test.login["action"] )
		      	done();
		    });
	  	});



  		// describe('Login with fake credential' , function(){
  		// 	it('should reject', function(done){
	  	// 		var postdata = {};
	  	// 		//construct the post data from config
	  	// 		for(var i in global.test.login.fields){
	  	// 			var name = global.test.login.fields[i];
	  	// 			postdata[name] = config.login_fields_values[name] + "@";
	  	// 		}

	  	// 		global.state_var = "xyz";  //TODO: gen rand string

	  	// 		//perform a login

				// request
				// 	.post(utils.getRelativePath(config.uri, global.test.login["action"]))
				//     .type('form') 
				// 	.set('User-Agent',test_options.user_agent)
				//     .redirects(0)
				// 	.send(postdata)
				// 	.end(function(err, res){
				// 		should.not.exist(err, res.text);
				// 		done();
				// 	});


	  	// });


  		describe('Login with provided credential' , function(){

  			it('should reject bad credential', function(done){
	  			var postdata = {};
	  			//construct the post data from config
	  			for(var i in global.test.login.fields){
	  				var name = global.test.login.fields[i];
	  				postdata[name] = "x" + config.login_fields_values[name];
	  			}

	  			global.state_var = "xyz";  //TODO: gen rand string

	  			//perform a login

				request
					.post(utils.getRelativePath(config.uri, global.test.login["action"]))
				    .type('form') 
					.set('User-Agent',test_options.user_agent)
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
	  			for(var i in global.test.login.fields){
	  				var name = global.test.login.fields[i];
	  				postdata[name] = config.login_fields_values[name];
	  			}

	  			global.state_var = "xyz";  //TODO: gen rand string

	  			//perform a login

				request
					.post(utils.getRelativePath(config.uri, global.test.login["action"]))
				    .type('form') 
					.set('User-Agent',test_options.user_agent)
				    .redirects(0)
					.send(postdata)
					.end(function(err, res){
						should.not.exist(err, res.text);
						done();
					});


	  		});

	  		it('should accept credential', function(done){
	  			var parameters = {
					    	"response_type" : "code",
					    	"client_id": config.gold_client.client_id,
					    	"state" : global.state_var,
					    	"redirect_uri": config.gold_client.redirect_uri,
					    	"scope": "bookmarks.fields"
				}
			    
			    var auth_url = utils.getRelativePath(config.uri, global.test.oada_configuration["authorization_endpoint"]);
			    	auth_url += "/" + "?" + utils.getQueryString(parameters);

			    var req = request
			    		.get(auth_url)
			    		.set('User-Agent',test_options.user_agent)
			    		.type('form');

			    req.expect(200)
			        .end(function(err,res){
			    		should.not.exist(err, res.text);
			    		global.test["grantscreen"] = {"html": ""}
			    		global.test.grantscreen.html = res.text;
			    		done();
			    	});
	  		});
  		})

  		

  });

  describe('Grant Screen', function(){
  		var $;
  		before(function(){
  			$ = cheerio.load(global.test.grantscreen.html);
  		});

  		it('should correctly displays all requested scopes', function(done){
  			
  			//How should we decide whether all scopes are displayed
  			done();
  		});

  		it('should correctly displays trust level', function(done){

  		 	done();
  		});

  		it('should send access code to client when all permissions are granted', function(done){
  			//steal access code from query string

  			var data = {};

  			$("form input[type=text], input[type=password], input[type=hidden], textarea").each(function(m,t){
				data[$(this).attr("name")] = $(this).attr("value");
			});

			var form_action = $("form").attr("action");
			var post_url = utils.getRelativePath(config.uri, form_action);

			request
				.post(post_url)
				.set('User-Agent',test_options.user_agent)
				.type('form') 
				.send(data)
				.redirects(0)
				.expect(302)
				.end(function(err, res){
					should.not.exist(err, res.text);
					//intercept the redirection
					var intercepted_redir = utils.getQueryParameters(res.headers.location);
					intercepted_redir.should.have.property('code');
					global.test.access_code = intercepted_redir.code;
					//make sure states are equal
					assert.equal(global.state_var, intercepted_redir.state);

					done();
				});

  		 	
  		});

  });

  
  describe('Obtaining Access Token', function(){
  		var cert;
  		var secret;
  		var token_endpoint;

  		before(function(){
  			token_endpoint = global.test.oada_configuration.token_endpoint;
  			cert = fs.readFileSync('certs/private.pem');
  			secret = utils.generateClientSecret(
				cert,
				config.gold_client.client_id,
				token_endpoint,
				global.test.access_code,
				config.gold_client.key_id
			);

  		});

  	

		it('should NOT exchange access code for bad request parameters', function(done){
  			//try wrong parameter
			var post_param = {
				"grant_type": "authorization_code",
				"code": global.test.access_code + "x",
				"redirect_uri": config.gold_client.redirect_uri,
				"client_id": config.gold_client.client_id,
				"client_secret": secret
			}
			var proto = JSON.stringify(post_param);

			var toggles = [ ]

			for(var p = 0; p < 32 ; p++){
				//get bit representation of p
				var bitstr = p.toString(2);
				//00001 means we will manipulate (invalidate) `client_secret` parameter
				//00010 means we will manipulate `client_id` .etc
				var bad_param = JSON.parse(proto);
				for(var i = 0; i < bitstr.length; i++){
					if(bitstr[i] == "1"){
						//manipulate ith parameter of post_param
						var key = Object.keys(post_param)[i];
						bad_param[key] = "BAD1BAD" + bitstr;
					}
				}
				toggles.push(bad_param);
			}

			var recurse = function(f){
				// If we have tested all possible
				// combination of bad request parameter
				// trigger done callback

				if(toggles.length == 0){
					done();
					return;
				}
				f();
			}

			var post_to = utils.getRelativePath(config.uri, token_endpoint);

			var mkrequest = function(){
				request
					.post(post_to)
					.type('form') 
					.set('User-Agent', test_options.user_agent)
					.send(toggles.pop())
					.expect(200)
					.end(function(err, res){
			      		should.exist(err, res.text);
			      		recurse(mkrequest);
					});
			}

			mkrequest();
			
  		});



  		it('should exchange access code for a token', function(done){
			var post_param = {
				"grant_type": "authorization_code",
				"code": global.test.access_code,
				"redirect_uri": config.gold_client.redirect_uri,
				"client_id": config.gold_client.client_id,
				"client_secret": secret
			}

			var post_to = utils.getRelativePath(config.uri, token_endpoint);
			request
				.post(post_to)
				.type('form') 
				.set('User-Agent', test_options.user_agent)
				.send(post_param)
				.expect(200)
				.end(function(err, res){
		      		should.not.exist(err, res.text);
		      		global.test.token_response = JSON.parse(res.text);
					done();
				});
  		});


  		it('should not exchange access code for a USED token', function(done){
			var post_param = {
				"grant_type": "authorization_code",
				"code": global.test.access_code,
				"redirect_uri": config.gold_client.redirect_uri,
				"client_id": config.gold_client.client_id,
				"client_secret": secret
			}

			var post_to = utils.getRelativePath(config.uri, token_endpoint);

			request
				.post(post_to)
				.type('form') 
				.set('User-Agent', test_options.user_agent)
				.send(post_param)
				.expect(200)
				.end(function(err, res){
		      		should.exist(err, res.text);
					done();
				});
  		});


  		it('should verify that token is valid', function(done){
  			global.test.token_response.should.have.property('access_token');
  			global.test.token_response.should.have.property('expires_in');
  		 	done();
  		});

  });

  describe('Obtaining ID Token', function(){
		//Get app /.well-known/oada-configuration
		// user is authorized already
		//Get identity provider's /.well-known/openid-configuration
		
  });

});

