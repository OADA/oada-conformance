exports.authorization = {
  uri: 'https://www.valleyix.com/Oada/Web',
  goldClient : {
    'client_id': '3klaxu838akahf38acucaix73@identity.oada-dev.com',
    'key_id': 'xkja3u7ndod83jxnzhs6',
    'redirect_uri': 'https://client.oada-dev.com/redirect'
  },
  automation: {
      login: {
        fields: {
            '#txtGrowerUserName': 'TestGrower',
            '#txtGrowerPassword': 'Valmont#1',
            '#txtGrowerUrl': 'https://test.basestation3.com'
        },
        clickOn: '#btnSubmit'
      }
  }
};

exports.options = {
    userAgentValue : 'OADA-Compliance-Test/1.1 (mocha; node-js)'
};