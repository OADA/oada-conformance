/*
*  Tests ability to get token in OAuth 2 implicity grant flow
*
*/
var request = require('supertest');
var chai = require('chai');
chai.use(require('chai-json-schema'));
var assert = chai.assert;
var should = chai.should();
var cheerio = require('cheerio');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var jws = require('jws-jwk').shim();
var utils = require('../utils.js');

var config = require('../config.js').authorization;
var test_options = require('../config.js').options;
//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var global = {
	test : {}
}

var request = request.agent(config.uri);

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



describe('Obtaining token (implicit flow)', function(){
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



  		describe('Login with provided credential' , function(){
  			it('should save cookie', function(done){
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

	  		it('should authorize', function(done){
	  			var parameters = {
					    	"response_type" : "token",
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

			    req.expect(200).end(function(err,res){
			    		should.not.exist(err, res.text);
			    		global.test["grantscreen"] = {"html": ""}
			    		global.test.grantscreen.html = res.text;
			    		done();
			    });
	  		});
  		})

  });
	

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

  		it('should get access code', function(done){
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
					intercepted_redir.should.have.property('access_token');
					global.test.access_token = intercepted_redir.access_token;
					// //make sure states are equal
					assert.equal(global.state_var, intercepted_redir.state);

					done();
				});

  		 	
  		});

  });

