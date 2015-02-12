/* Configuration for server under test */

/*
exports.authorization = {
  uri: "https://identity.oada-dev.com",
  login_fields_values: {
  	username: "andy",
  	password: "pass"
  },
  gold_client : {
  	client_id: "389kxhcnjmashlsxd8@identity.oada-dev.com",
  	key_id: "xkja3u7ndod83jxnzhs6",
  	redirect_uri: "https://example.org/redirect"
  },
  gold_server: { 
	client_id: "",
	key_id: "",
	redirect_uri: ""
  }
};
*/

exports.authorization = {
  uri: "https://localhost:8443",
  login_fields_values: {
  	username: "frank",
  	password: "pass"
  },
  gold_client : {
  	client_id: "389kxhcnjmashlsxd8@identity.oada-dev.com",
  	key_id: "xkja3u7ndod83jxnzhs6",
  	redirect_uri: "https://example.org/redirect"
  },
  gold_server: { 
	client_id: "",
	key_id: "",
	redirect_uri: ""
  }
};

exports.options = {
	user_agent : "OADA-Compliance-Test/1.1 (mocha; node-js)"
}
