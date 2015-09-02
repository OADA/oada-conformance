'use strict';
var wellKnown = require('../../lib/wellKnown');

describe('Test', function() {

    describe('Dynamic CLient Registration', function() {

        before(function() {
            wellKnown.ensureOadaConfiguration(this);
        });

        // TODO: Should we just test for the success path here?
        //       Or all the failures too? I guess the question is:
        //         - Should we allways test all the failures or
        //           just test the failures once and then do all
        //           the sucess paths?

        it('test', function() {
            console.log(this);
        });

        it('Should register', function() {
            console.log(this);
        });

    });
});
