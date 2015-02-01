/* Configuration for server under test */

exports.authorization = {
  uri: "https://identity.oada-dev.com",
  login_fields_values: {
  	username: "andy",
  	password: "pass"
  },
  gold_client : {
	client_id: "3klaxu838akahf38acucaix73@identity.oada-dev.com",
	key_id: "nc63dhaSdd82w32udx6v",
	redirect_uri: "https://client.oada-dev.com/redirect"
  }
};

exports.options = {
	user_agent : "OADA-TEST/1.0 (mocha; node-js)"
}