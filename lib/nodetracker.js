var OZW = require('openzwave');
var util = require('util');
var events = require('events');
var moment = require('moment');

// base class for all node trackers.
var baseTracker = function() {
  events.EventEmitter.call(this);
  this.scanComplete = false;
  this.nodes = {};
  this.timerId = undefined;
};
util.inherits(baseTracker, events.EventEmitter);

baseTracker.prototype.getNodes = function() {
  var nodes = [];
  if (this.scanComplete) {
    for (var key in this.nodes) {
      nodes.push(this.nodes[key]);
    }
  }
  return nodes;
};

baseTracker.prototype.maybeEmitUpdate = function(node) {
  if (node.ready) {
    this.emit('update', [node]);
  }
};

baseTracker.prototype.start = function() {
  // Not Implemented
};

baseTracker.prototype.stop = function() {
  if (this.timerId) {
    this.clearTimeout(this.timerId);
    this.timerId = undefined;
  }
  this.nodes = {};
  this.scanComplete = false;
};

baseTracker.prototype.scheduleNextEvent = function() {
  console.log('scheduleNextEvent');
  var self = this;
  if (this.timerId) {
    console.log('cancelling ' + this.timerId);
    clearTimeout(this.timerId);
    this.timerId = undefined;
  }
  var nextEvents = this.getNextEvents();
  if (nextEvents.length > 0) {
    console.log('next event at ' + nextEvents[0].moment);
    var timeUntilEvent = nextEvents[0].moment.diff(moment());
    console.log('time until next event ' + timeUntilEvent);
    this.timerId = setTimeout(function() {
      console.log("timeout expired");
      nextEvents.forEach(function(event) {
        self.setValue(event.nodeId, 37, 0, event.value);
      });
      this.timerId = undefined;
      self.scheduleNextEvent();
    }, timeUntilEvent); 
    console.log('scheduled ' + this.timerId);
  }
};

baseTracker.prototype.getNextEvents = function() {
  var now = moment();
  var futureEvents = [];
  for (var nodeId in this.nodes) {
    var node = this.nodes[nodeId];
    for (var eventId in node.recurringEvents) {
      var eventSpec = node.recurringEvents[eventId];
      var nextEventTime = moment().utc()
          .isoWeekday(eventSpec.weekday)
          .hour(eventSpec.hour)
          .minute(eventSpec.minute)
          .second(0)
          .millisecond(0);
      if (nextEventTime.isBefore(now)) {
        nextEventTime.add('weeks', 1);
      }
      futureEvents.push({
        moment: nextEventTime,
        nodeId: nodeId,
        value: eventSpec.value
      });
    }
  }
  futureEvents.sort(function(a, b) {
    if (a.moment.isBefore(b.moment)) {
      return -1;
    } else if (a.moment.isAfter(b.moment)) {
      return 1;
    }
    return 0;
  });
  futureEvents.forEach(function(eventSpec) {
    console.log('node ' + eventSpec.nodeId + ' @ ' + eventSpec.moment.fromNow());
  });
  if (futureEvents.length > 0) {
    var nextMoment = futureEvents[0].moment;
    futureEvents = futureEvents.filter(function(event) {
      return event.moment.isSame(nextMoment);
    });
    return futureEvents;
  }
  return [];
};

baseTracker.prototype.setValue = function(nodeId, commandClass, index, value) {
  // Not Implemented
};

baseTracker.prototype.setLocation = function(nodeId, location) {
  // Not Implemented
};

baseTracker.prototype.setName = function(nodeId, name) {
  // Not Implemented
};

function eventId(eventSpec) {
  return 60*24*eventSpec.weekday + 60*eventSpec.hour + eventSpec.minute;
}

baseTracker.prototype.addRecurringEvent = function(nodeId, eventSpec) {
  var node = this.nodes[nodeId];
  var id = eventId(eventSpec);
  eventSpec.id = id;  // Add id to the eventSpec for ease of use.
  if (id in node.recurringEvents) {
    console.log('recurring event already exists at that time');
  } else {
    node.recurringEvents[id] = eventSpec;
    this.scheduleNextEvent();
    this.maybeEmitUpdate(node);
  }
};

baseTracker.prototype.removeRecurringEvent = function(nodeId, eventId) {
  var node = this.nodes[nodeId];
  if (eventId in node.recurringEvents) {
    delete node.recurringEvents[eventId];
    this.scheduleNextEvent();
    this.maybeEmitUpdate(node);
  } else {
    console.log('recurring event with ' + eventId + ' does not exist');
  }
};

// fakeTracker that doesn't depend on zwave.
var fakeTracker = function() {
  baseTracker.call(this);
};
util.inherits(fakeTracker, baseTracker);

fakeTracker.prototype.start = function() {
  var self = this;
  this.scanComplete = true;
  this.scheduleNextEvent();
  this.emit('ready');
};

fakeTracker.prototype.stop = function() {
  baseTracker.prototype.stop.call(this);
};

fakeTracker.prototype.setValue = function(nodeId, commandClass, index, value) {
  var node = this.nodes[nodeId];
  if (commandClass in node.classes && index in node.classes[commandClass]) {
    node.classes[commandClass][index].value = value;
    this.maybeEmitUpdate(node);
  }
};

fakeTracker.prototype.setLocation = function(nodeId, location) {
  var node = this.nodes[nodeId];
  node.location = location;
  this.maybeEmitUpdate(node);
};

fakeTracker.prototype.setName = function(nodeId, name) {
  var node = this.nodes[nodeId];
  node.name = name;
  this.maybeEmitUpdate(node);
};

fakeTracker.prototype.createFakeSwitch = function(nodeId) {
  this.nodes[nodeId] = {
    id: nodeId,
    manufacturer: 'fake switch mfg ' + nodeId,
    manufacturerid: 'fake switch mfgid ' + nodeId,
    product: 'fake product ' + nodeId,
    producttype: 'fake producttype ' + nodeId,
    productid: 'fake productid ' + nodeId,
    type: 'fake type ' + nodeId,
    name: 'fake name ' + nodeId,
    loc: 'fake location ' + nodeId,
    classes: {
      37: {
        0: {
          value: Boolean(nodeId % 2)
        }
      }
    },
    recurringEvents: {},
    ready: true
  };
};

fakeTracker.prototype._toggleRandomSwitch = function() {
  var nodeIds = Object.keys(this.nodes);
  var nodeCount = nodeIds.length;
  var randomIndex = Math.floor(Math.random() * nodeCount);
  var randomNodeId = nodeIds[randomIndex];
  var randomNode = this.nodes[randomNodeId];
  var currentValue = randomNode.classes[37][0].value;
  this.setValue(randomNodeId, 37, 0, !currentValue);
};

// tracker, a zwave node tracker
var tracker = function() {
  baseTracker.call(this);
  var self = this;
  self.zwave = new OZW('/dev/ttyUSB0', {
    saveconfig: true
  });
  self.zwave.on('driver failed', function() {
    console.log('driver failed');
    self.zwave.disconnect();
    self.emit('failed');
  });
  self.zwave.on('scan complete', function() {
    self.scanComplete = true;
    self.emit('ready');
  });
  self.zwave.on('node added', function(nodeId) {
    self.nodes[nodeId] = {
      id: nodeId,
      manufacturer: '',
      manufacturerid: '',
      product: '',
      producttype: '',
      productid: '',
      type: '',
      name: '',
      loc: '',
      classes: {},
      ready: false
    };
  });
  self.zwave.on('value added', function(nodeId, klass, value) {
    var node = self.nodes[nodeId];
    if (!node.classes[klass])
      node.classes[klass] = {};
    node.classes[klass][value.index] = value;
    self.maybeEmitUpdate(node);
  });
  self.zwave.on('value changed', function(nodeId, klass, value) {
    var node = self.nodes[nodeId];
    node.classes[klass][value.index] = value;
    self.maybeEmitUpdate(node);
  });
  self.zwave.on('value removed', function(nodeId, klass, index) {
    var node = self.nodes[nodeId];
    if (node.classes[klass] && node.classes[klass][index]) {
      delete node.classes[klass][index];
      self.maybeEmitUpdate(node);
    }
  });
  self.zwave.on('node ready', function(nodeId, nodeinfo) {
    var node = self.nodes[nodeId];
    node.manufacturer = nodeinfo.manufacturer;
    node.manufacturerid = nodeinfo.manufacturerid;
    node.product = nodeinfo.product;
    node.producttype = nodeinfo.producttype;
    node.productid = nodeinfo.productid;
    node.type = nodeinfo.type;
    node.name = nodeinfo.name;
    node.loc = nodeinfo.loc;
    node.ready = true;
    node.recurringEvents = {};
    for (var klass in node.classes) {
      switch (klass) {
        case 0x25:  // COMMAND_CLASS_SWITCH_BINARY
        case 0x26:  // COMMAND_CLASS_SWITCH_MULTILEVEL
          self.zwave.enablePoll(nodeId, klass);
          break;
      }
    }
    self.maybeEmitUpdate(node);
  });
};
util.inherits(tracker, baseTracker);

tracker.prototype.start = function(node) {
  this.zwave.connect();
};

tracker.prototype.stop = function(node) {
  this.zwave.disconnect();
  this.nodes = {};
  this.scanComplete = false;
};

tracker.prototype.setValue = function(nodeId, commandClass, index, value) {
  this.zwave.setValue(nodeId, commandClass, index, value);
};

tracker.prototype.setLocation = function(nodeId, location) {
  this.zwave.setLocation(nodeId, location);
  var node = this.nodes[nodeId];
  node.loc = location;
  this.maybeEmitUpdate(node);
};

tracker.prototype.setName = function(nodeId, name) {
  this.zwave.setName(nodeId, name);
  var node = this.nodes[nodeId];
  node.name = name;
  this.maybeEmitUpdate(node);
};

module.exports = {
  fakeTracker: fakeTracker,
  tracker: tracker
};

