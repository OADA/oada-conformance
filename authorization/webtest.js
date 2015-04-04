var page = require('webpage').create();
page.open('http://www.httpuseragent.org', function(status) {
  if (status !== 'success') {
    console.log('Unable to access network');
  } else {
    var ua = page.evaluate(function() {
      return document.getElementById('myagent').textContent;
    });
    console.log(ua);
  }
  phantom.exit();
});
