var request = require('supertest');
var chai = require('chai');
chai.use(require('chai-json-schema'));
var assert = chai.assert;
var should = chai.should();
var cheerio = require('cheerio');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var jws = require('jws-jwk').shim();

var config = require('../config.js').authorization;
var global = {
	test : {}
}
var request = request.agent(config.uri);

/**
*  determine absolute URI from relative URI
*/
var getAbsoluteURI = function(scope, relative_url){
 	var url = scope + "/" + relative_url;
    if(relative_url[0] == "/"){
    	url = relative_url.replace(/^\//, config.uri + "/");
    }
    return url;
}

var getRelativePath = function(uri){
	var path = uri.replace(config.uri, "");
	if(path[0] != "/"){
		path = "/" + path;
	}
	return path;
}

var getQueryString = function(dict){
		var str = [];
		for(var key in dict){
			str.push(key + "=" + encodeURIComponent(dict[key]));
		}
		return str.join("&");
}

/**
*  Part 1 - Check that it can do OAuth 
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
	      	should.not.exist(err);

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
		    var path = getRelativePath(login_uri);

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
		      	should.not.exist(err);
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

				global.test.login["action"] = getAbsoluteURI(current_uri, form_action);

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
					.post(getRelativePath(global.test.login["action"]))
				    .type('form') 
				    .redirects(0)
					.send(postdata)
					.end(function(err, res){
						should.not.exist(err);
						done();
					});


	  		});

	  		it('should authorize', function(done){
	  			var parameters = {
					    	"response_type" : "code",
					    	"client_id": config.gold_client.client_id,
					    	"state" : global.state_var,
					    	"redirect_uri": config.gold_client.redirect,
					    	"scope": "bookmarks.fields"
				}
			    
			    var auth_url = getRelativePath(global.test.oada_configuration["authorization_endpoint"]);
			    	auth_url += "/" + "?" + getQueryString(parameters);

			    var req = request
			    		.get(auth_url)
			    		.type('form');
			    req.expect(200)
			        .end(function(err,res){
			    		should.not.exist(err);
			    		global.test["grantscreen"] = {"html": ""}
			    		global.test.grantscreen.html = res.text;
			    		done();
			    	});
	  		});
  		})

  		

  });

  describe('Grant Screen', function(){


  		it('should correctly displays all requested scopes', function(done){
  			$ = cheerio.load(global.test.grantscreen.html);
  			//How should we decide whether all scopes are displayed
  			done();
  		});

  		it('should correctly displays trust level', function(done){

  		 	done();
  		});

  		it('should send access code to client when all permissions are granted', function(done){

  		 	done();
  		});

  });

  describe('Token', function(){


  		it('should exchange access code for a token', function(done){
  			done();
  		});

  		it('should verify that token is valid', function(done){
  		 	done();
  		});

  });

});

