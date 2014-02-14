if (process.env.NODE_ENV == "fake") {
    var nodeTracker = require('./lib/fakenodetracker.js');
} else {
    var nodeTracker = require('./lib/nodetracker.js');
}

var tracker = new nodeTracker();
require('./lib/main.js')(tracker);
