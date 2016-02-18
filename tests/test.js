/* Copyright 2016 Open Ag Data Alliance
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

var _ = require('lodash');
var is = require('is_js');
var beautify = require('beautify-text');
var chalk = require('chalk');

var decorate = require('./decorate_tape');

// Add is assertions to tests
var tape = decorate(require('blue-tape'), {
    asserts: is,
    name: 'is',
    unflat: true
});

// Add boolean function assertion to tests
/*
tape.Test.prototype.fun = function fun(f, val, mesg, extra) {
    extra = Object.assign({}, extra, {operator: f.name});

    return this.ok(f(val), mesg, extra);
};
*/

// Add includes to tests
tape.Test.prototype.includes = function includes(col, val, msg) {
    return this.ok(_.includes(col, val), msg, {
        operator: 'includes',
        expected: val,
        actual: col
    });
};

// TAP todo is missing
tape.Test.prototype.todo = tape.Test.prototype.todo || tape.Test.prototype.skip;

var RARROW = beautify('--->');
var LARROW = beautify('<---');
var LINE = beautify('---');
var BACKSPACE = '\x08';

function commentStr(str) {
    return chalk.blue(BACKSPACE + BACKSPACE + '# ' + str);
}

// Make comments work better with faucet
var comment = tape.Test.prototype.comment;
tape.Test.prototype.comment = function(msg) {
    return comment.call(this, commentStr(msg));
};

// TODO: Don't like this name...
function describe(depth, name, cb) {
    /* jshint validthis: true */
    var sname = RARROW + name;
    var ename = LINE + name;
    for (var i = 1; i < depth; i++) {
        sname = LINE + LINE + sname;
        ename = LINE + LINE + ename;
    }
    sname = LINE + sname;
    ename = LARROW + ename;

    this.test(commentStr(sname), cb && function(t) {
        // Don't allow any real assertions in a describe
        var tt = {
            test: t.test.bind(t),
            skip: t.skip.bind(t),
            todo: t.todo.bind(t),
            comment: t.comment.bind(t),
            describe: describe.bind(t, depth + 1),
        };

        return cb(tt);
    });

    this.test(commentStr(ename), function(t) {
        t.end();
    });
}
tape.describe = describe.bind(tape, 1);

module.exports = tape;
