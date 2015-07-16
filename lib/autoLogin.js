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
var phantom = require('phantom');

var DEBUG_TAG = 'autoLogin';
var debug = require('debug')(DEBUG_TAG);
// Use debug for phantom console/alert too
var pConsole = require('debug')(DEBUG_TAG + ':console');
var pAlert = require('debug')(DEBUG_TAG + ':alert');
var pError = require('debug')(DEBUG_TAG + ':error');

var ph = Promise.fromNode(function(callback) {
    return phantom.create('--ignore-ssl-errors=yes', function(ph) {
        callback(null, ph);
    });
});

// Returns ending URL
module.exports = function autoLogin(startUrl, actions, callback) {
    var page =
        ph.then(function createPage(ph) {
            return Promise.fromNode(function(callback) {
                return ph.createPage(function(page) {
                    return callback(null, page);
                });
            });
        }).tap(function openStartUrl(page) {
            return Promise.fromNode(function(callback) {
                return page.open(startUrl, function(status) {
                    if (status !== 'success') {
                        return callback(new Error('Could not open page'));
                    }

                    return callback();
                });
            });
        });

    // Debug stuff for phantom
    page.call('onConsoleMessage', pConsole);
    page.call('set', 'onAlert', pAlert);
    page.call('onError', pError);

    var endUrl = page.then(function(page) {
        var acted = Promise.each(actions, function(pageActions, p) {
            debug('Starting login action set ' + p);

            var pLoaded = Promise.fromNode(function(callback) {
                page.set('onUrlChanged', null, function() {
                    return callback();
                });
            }).delay(1000); // TODO: Remoeve this

            var pActed = Promise.fromNode(function(callback) {
                return page.evaluate(
                        doPageActions,
                        function(success) {
                            return callback(null, success);
                        },
                        pageActions);
            }).tap(function(success) {
                if (success) {
                    return;
                }

                var msg = 'Could not perform login actions set ' + p;
                return Promise.reject(new Error(msg));
            });

            return Promise.join(pActed, pLoaded).tap(function() {
                debug('Finished login action set ' + p);
            });
        });

        return acted.then(function() {
            return Promise.fromNode(function(callback) {
                return page.get('url', function(url) {
                    return callback(null, url);
                });
            });
        });
    });

    return endUrl.nodeify(callback);
};

/*
 * Functions to evaluate in phantomjs
 */
/* jshint browser: true */

function doPageActions(pageActions) {
    pageActions.forEach(function(action) {
        var el = document.querySelector(action.id);
        console.log('id: ' + action.id);
        console.log('type: ' + action.type);

        switch (action.type) {
        //TODO: Actually send typing events
        case 'type':
            el.value = action.value;
            console.log('type: ' + action.value);
            break;
        case 'click':
            el.click();
            console.log('click');
            break;
        default:
            throw new TypeError('Unknown action type');
        }
    });

    // phantom is lame about errors
    // Make sure true was returned to know evaluate worked
    return true;
}
