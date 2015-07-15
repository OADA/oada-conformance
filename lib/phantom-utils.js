'use strict';

exports.click = function(el) {
    /* jshint browser: true */
    var ev = document.createEvent('MouseEvent');
    ev.initMouseEvent(
        'click',
        true /* bubble */, true /* cancelable */,
        window, null,
        0, 0, 0, 0, /* coordinates */
        false, false, false, false, /* modifier keys */
        0 /*left*/, null
    );
    el.dispatchEvent(ev);
};
