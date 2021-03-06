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

'use strict';

var nconf = require('nconf');

nconf.env('__');

// Default to testing identity.oada-dev.com
var config = nconf.get('CONFIG') || './config.local.js';
nconf.use('config', {type: 'literal', store: require(config)});

// Load config defaults
nconf.defaults(require('./config.defaults.js'));

module.exports = nconf;
