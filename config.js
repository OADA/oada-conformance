exports.authorization = {
  uri: "https://localhost:8443",
  loginFieldsValue: {
  	username: "frank",
  	password: "pass"
  },
  goldClient : {
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
	userAgentValue : "OADA-Compliance-Test/1.1 (mocha; node-js)"
}
