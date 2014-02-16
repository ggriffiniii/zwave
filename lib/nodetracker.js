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
  var self = this;
  if (this.timerId) {
    clearTimeout(this.timerId);
    this.timerId = undefined;
  }
  var nextEvents = this.getNextEvents();
  if (nextEvents.length > 0) {
    var timeUntilEvent = nextEvents[0].moment.diff(moment());
    this.timerId = setTimeout(function() {
      console.log("timeout expired");
      nextEvents.forEach(function(event) {
        self.setValue(event.nodeid, 37, 0, event.value);
      });
      this.timerId = undefined;
      self.scheduleNextEvent();
    }, timeUntilEvent); 
  }
};

baseTracker.prototype.getNextEvents = function() {
  var now = moment();
  var futureEvents = [];
  var addToFutureEvents = function(recurringEventSpec) {
    var eventTime = moment()
        .weekday(recurringEventSpec.weekday)
        .hour(recurringEventSpec.hour)
        .minute(recurringEventSpec.minute)
        .second(0)
        .millisecond(0);
    if (eventTime.isBefore(now)) {
      eventTime.add('weeks', 1);
    }
    futureEvents.push({
      moment: eventTime,
      nodeid: nodeid,
      value: recurringEventSpec.value
    });
  };
  for (var nodeid in this.nodes) {
    var node = this.nodes[nodeid];
    node.recurringEvents.forEach(addToFutureEvents);
  }
  futureEvents.sort(function(a, b) {
    if (a.moment.isBefore(b.moment)) {
      return -1;
    } else if (a.moment.isAfter(b.moment)) {
      return 1;
    }
    return 0;
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


baseTracker.prototype.setValue = function(nodeid, commandClass, index, value) {
  // Not Implemented
};

baseTracker.prototype.setLocation = function(nodeid, location) {
  // Not Implemented
};

baseTracker.prototype.setName = function(nodeid, name) {
  // Not Implemented
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

fakeTracker.prototype.setValue = function(nodeid, commandClass, index, value) {
  var node = this.nodes[nodeid];
  if (commandClass in node.classes && index in node.classes[commandClass]) {
    node.classes[commandClass][index].value = value;
    this.maybeEmitUpdate(node);
  }
};

fakeTracker.prototype.setLocation = function(nodeid, location) {
  var node = this.nodes[nodeid];
  node.location = location;
  this.maybeEmitUpdate(node);
};

fakeTracker.prototype.setName = function(nodeid, name) {
  var node = this.nodes[nodeid];
  node.name = name;
  this.maybeEmitUpdate(node);
};

fakeTracker.prototype.createFakeSwitch = function(nodeid) {
  this.nodes[nodeid] = {
    id: nodeid,
    manufacturer: 'fake switch mfg ' + nodeid,
    manufacturerid: 'fake switch mfgid ' + nodeid,
    product: 'fake product ' + nodeid,
    producttype: 'fake producttype ' + nodeid,
    productid: 'fake productid ' + nodeid,
    type: 'fake type ' + nodeid,
    name: 'fake name ' + nodeid,
    loc: 'fake location ' + nodeid,
    classes: {
      37: {
        0: {
          value: Boolean(nodeid % 2)
        }
      }
    },
    recurringEvents: [],
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
  self.zwave.on('node added', function(nodeid) {
    self.nodes[nodeid] = {
      id: nodeid,
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
  self.zwave.on('value added', function(nodeid, klass, value) {
    var node = self.nodes[nodeid];
    if (!node.classes[klass])
      node.classes[klass] = {};
    node.classes[klass][value.index] = value;
    self.maybeEmitUpdate(node);
  });
  self.zwave.on('value changed', function(nodeid, klass, value) {
    var node = self.nodes[nodeid];
    node.classes[klass][value.index] = value;
    self.maybeEmitUpdate(node);
  });
  self.zwave.on('value removed', function(nodeid, klass, index) {
    var node = self.nodes[nodeid];
    if (node.classes[klass] && node.classes[klass][index]) {
      delete node.classes[klass][index];
      self.maybeEmitUpdate(node);
    }
  });
  self.zwave.on('node ready', function(nodeid, nodeinfo) {
    var node = self.nodes[nodeid];
    node.manufacturer = nodeinfo.manufacturer;
    node.manufacturerid = nodeinfo.manufacturerid;
    node.product = nodeinfo.product;
    node.producttype = nodeinfo.producttype;
    node.productid = nodeinfo.productid;
    node.type = nodeinfo.type;
    node.name = nodeinfo.name;
    node.loc = nodeinfo.loc;
    node.ready = true;
    node.recurringEvents = [];
    for (var klass in node.classes) {
      switch (klass) {
        case 0x25:  // COMMAND_CLASS_SWITCH_BINARY
        case 0x26:  // COMMAND_CLASS_SWITCH_MULTILEVEL
          self.zwave.enablePoll(nodeid, klass);
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

tracker.prototype.setValue = function(nodeid, commandClass, index, value) {
  this.zwave.setValue(nodeid, commandClass, index, value);
};

tracker.prototype.setLocation = function(nodeid, location) {
  this.zwave.setLocation(nodeid, location);
  var node = this.nodes[nodeid];
  node.loc = location;
  this.maybeEmitUpdate(node);
};

tracker.prototype.setName = function(nodeid, name) {
  this.zwave.setName(nodeid, name);
  var node = this.nodes[nodeid];
  node.name = name;
  this.maybeEmitUpdate(node);
};

module.exports = {
  fakeTracker: fakeTracker,
  tracker: tracker
};

