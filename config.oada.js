//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
require('bluebird').longStackTraces();

module.exports = {
    server: {
        //uri: 'https://localhost:3000',
        uri: 'https://identity.oada-dev.com',
    },
    authorization: {
        // TODO: Make flows (change to implicit/code?)
        types: ['token', 'code', 'id_token'],
        logins: {
            andy: {
                scopes: ['bookmarks.machines'],
                actions: [
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
                ],
            },
            badpass: {
                fail: true,
                scopes: ['bookmarks.machines'],
                actions: [
                    [
                        {
                            id: '[name="username"]',
                            type: 'type',
                            value: 'andy',
                        },
                        {
                            id: '[name="password"]',
                            type: 'type',
                            value: 'badpass',
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
                ],
            }
        }
    },
    options: {
        userAgent: 'OADA-Conformance-Tests/1.1 (mocha; node-js)'
    }
};
