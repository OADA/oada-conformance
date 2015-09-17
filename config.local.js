/* Copyright 2015 Open Ag Data Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//Allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
require('bluebird').longStackTraces();

module.exports = {
    server: {
        uri: 'https://localhost:3000'
    },
    authorization: {
        logins: {
            frank: {
                scopes: ['bookmarks.machines'],
                actions: [
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
    bookmarks: {
        login: 'frank'
    },
    options: {
        origin: 'https://openag.io'
    }
};
