exports.authorization = {
    uri: 'https://identity.oada-dev.com',
    loginFieldsValue: {
        username: 'andy',
        password: 'pass'
    },
    goldClient : {
        'client_id':
            '247CD1CF-9DF4-483E-9F85-83E2D61FBDF6@identity.oada-dev.com',
        'key_id': 'xkja3u7ndod83jxnzhs6',
        'redirect_uri': 'https://example.org/redirect'
    },
    goldServer: {
        'client_id': '',
        'key_id': '',
        'redirect_uri': ''
    },
    loginActions: [
         [
            {
                id: '[name="username"]',
                type: 'type',
                value: 'andy',
            },
            {
                id: '[name="password"]',
                type: 'type',
                value: 'pass',
            },
            {
                id: '.btn-success',
                type: 'click'
            }
        ],
        [
            {
                id: '#allow',
                type: 'click'
            }
        ]
    ]
};
