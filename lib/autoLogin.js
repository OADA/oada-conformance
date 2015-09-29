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

var Promise = require('bluebird');
var _ = require('lodash');
var Horseman = require('node-horseman');

var DEBUG_TAG = 'autoLogin';
var debug = require('debug')(DEBUG_TAG);
// Use debug for phantomjs console/alert too
var dConsole = require('debug')(DEBUG_TAG + ':console');
var dAlert = require('debug')(DEBUG_TAG + ':alert');
var dError = require('debug')(DEBUG_TAG + ':error');
var dUrl = require('debug')(DEBUG_TAG + ':url');

var OPTIONS = {
    ignoreSSLErrors: true,
    loadImages: false,
    injectJqeury: false,
    timeout: 1000,
    interval: 10
};

// Return ending URL
module.exports = function autoLogin(startUrl, actions, callback) {
    var horseman = new Horseman(OPTIONS);

    // Debug stuff
    horseman.on('consoleMessage', function onConsole(msg, lineNum, sourceId) {
        dConsole('Console message:\t' + sourceId + ':' + lineNum);
        dConsole(msg);
    });
    horseman.on('error', function onError(msg, trace) {
        dError(msg);
        dError(trace);
    });
    horseman.on('alert', dAlert);
    horseman.on('urlChanged', dUrl);

    // Start chain of horseman actions
    var h = horseman
        .userAgent(module.exports.USER_AGENT)
        .open(startUrl);

    return Promise.try(function doActions() {
        // Append to chain of horseman actions
        _.each(actions, function doPageActions(pageActions) {
            _.each(pageActions, function doAction(action) {
                h = h.waitForSelector(action.id);
                var msg = action.id + ':' + action.type;
                msg += action.value ? ' ' + action.value : '';

                switch (action.type) {
                case 'type':
                    h = h.clear(action.id).type(action.id, action.value);
                    break;
                case 'click':
                    h = h.click(action.id);
                    break;
                case 'select':
                    h = h.select(action.id, action.value);
                    break;
                default:
                    throw new TypeError('Unknown login action type');
                }

                // Debug when action is performed
                h.tap(function() { debug(msg); }).catch(_.noop);
            });

            h = h.waitForNextPage();
        });

        return h.url();
    }).nodeify(callback).bind(horseman).finally(horseman.close);
};

