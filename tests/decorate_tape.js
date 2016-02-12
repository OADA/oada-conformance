/**
 * @license
 * Copyright 2015 Open Ag Data Alliance
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

var flatten = require('flat');
var unflatten = require('flat').unflatten;

/**
 * @param {object} tape
 * @param {object} opts {asserts: object, name: string, unflat: boolean}
 */
function wrap(tape, opts) {
    var asserts = flatten(opts.asserts);
    var funs = {};
    Object.keys(asserts).forEach(function(key) {
        if (typeof asserts[key] === 'function') {
            funs[opts.name + '.' + key] = asserts[key];
        }
    });

    Object.keys(funs).forEach(function(fname) {
        var flen = funs[fname].length;
        var operator = fname.replace(/\./g, ' ');

        tape.Test.prototype[fname] = function() {
            var args = Array.prototype.slice.call(arguments);
            var mesg = args.length > flen ? args.pop() : undefined;
            var val = args.length > 1 ? args : args[0];

            var extra = {
                operator: operator,
                actual: val,
                expected: true,
            };

            return this.ok(funs[fname].apply(opts.asserts, args), mesg, extra);
        };
    });

    if (opts.unflat) {
        var run = tape.Test.prototype.run;
        var name = opts.name;

        tape.Test.prototype.run = function() {
            var self = this;

            var obj = Object.keys(funs).reduce(function(obj, fname) {
                obj[fname] = self[fname].bind(self);
                return obj;
            }, {});
            this[name] = unflatten(obj)[name];

            return run.call(this, arguments);
        };
    }

    return tape;
}

module.exports = wrap;
