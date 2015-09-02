//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

module.exports = {
    authorization: {
        uri: 'https://localhost:3000',
        scopes: ['bookmarks.machines'],
        loginActions: [
            [
                {
                    id: '[name="username"]',
                    type: 'type',
                    value: 'frank',
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
    },
    options: {
        userAgentValue : 'OADA-Compliance-Test/1.1 (mocha; node-js)'
    }
};
