var trackers = require('./lib/nodetracker.js');
if (process.env.NODE_ENV == "fake") {
  var tracker = new trackers.fakeTracker();
  tracker.createFakeSwitch(1);
  tracker.createFakeSwitch(16);
  tracker.createFakeSwitch(33);
  tracker.createFakeSwitch(60);
  tracker.setRecurringEvents(1, [
    {
      weekday: 0,
      hour: 17,
      minute: 0,
      value: true
    },
    {
      weekday: 0,
      hour: 23,
      minute: 0,
      value: false
    },
  ]); 
} else {
  var tracker = new trackers.tracker();
}

require('./lib/main.js')(tracker);
