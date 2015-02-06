var jwt = require('jsonwebtoken');
var jws = require('jws-jwk').shim();

/**
*  determine absolute URI from relative URI
*/
exports.getAbsoluteURI = function(base, scope, relative_url){
 	var url = scope + "/" + relative_url;
    if(relative_url[0] == "/"){
    	url = relative_url.replace(/^\//, base + "/");
    }
    return url;
}

/*
*  get Relative path given full URI
*  - note there are corner cases that are not implemented
*  here. 
*/
exports.getRelativePath = function(base, urlstr){

	//TODO: if urlstr is in form https://host.com/c  -> /c
	//      if urlstr form /c    				     -> /c
	//      if urlstr in form c  					 -> CUR_URL + /c

	var path = urlstr.replace(base, "");
	if(path[0] != "/"){
		path = "/" + path;
	}
	return path;
}

exports.getQueryString = function(dict){
	var str = [];
	for(var key in dict){
		str.push(key + "=" + encodeURIComponent(dict[key]));
	}
	return str.join("&");
}

exports.getQueryParameters = function(uristr){
	var m = uristr.split(/[?|#]/)[1].split("&");
	var dict = {};
	for(var i in m){
		var pair = m[i].split("=");
		dict[pair[0]] = pair[1];
	}
	return dict;
}

exports.generateClientSecret = function(key, issuer, audience, accessCode ,kid){
	var sec = {
		ac : accessCode
	}
	var options = {
		algorithm: 'RS256',
		audience: audience,
		issuer: issuer,
		headers: {
			'kid': kid
		}
	}


	return jwt.sign(sec, key, options);
}

