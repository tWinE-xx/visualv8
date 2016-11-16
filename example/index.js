const visualV8 = require('../index.js')({
    host: 'localhost',
    port: 1919,
    interval: 3000
});

/* 
this causes memory leaks
*/
/*
var theThing = null;
var replaceThing = function () {
  var originalThing = theThing;
  var unused = function () {
    if (originalThing)
      console.log("hi");
  };
  theThing = {
    longStr: new Array(1000000).join('*'),
    someMethod: function () {
      console.log(someMessage);
    }
  };
};
setInterval(replaceThing, 1000);
*/