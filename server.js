var trackers = require('./lib/nodetracker.js');
if (process.env.NODE_ENV == "fake") {
    var tracker = new trackers.fakeTracker();
    tracker.createFakeSwitch(1);
    tracker.createFakeSwitch(16);
    tracker.createFakeSwitch(33);
    tracker.createFakeSwitch(60);
} else {
    var tracker = new trackers.tracker();
}

require('./lib/main.js')(tracker);
