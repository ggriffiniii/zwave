var OZW = require('openzwave');
var Nedb = require('nedb');
var async = require('async');
var util = require('util');
var events = require('events');
var moment = require('moment-timezone');
var suncalc = require('suncalc');

var homelatlong = '47.722530, -122.330333';

// base class for all node trackers.
var baseTracker = function() {
  events.EventEmitter.call(this);
  this.scanComplete = false;
  this.nodes = {};
  this.timerId = undefined;
  this.eventsDB = new Nedb({
    filename: __dirname + '/events.db',
    autoload: true
  });
};
util.inherits(baseTracker, events.EventEmitter);

baseTracker.prototype.getNode = function(node, cb) {
  this.eventsDB.find({ nodeId: node.id }, function(err, recurringEvents) {
    var nodeSpec = {
      id: node.id,
      manufacturer: node.manufacturer,
      manufacturerid: node.manufacturerid,
      product: node.product,
      producttype: node.producttype,
      productid: node.productid,
      type: node.type,
      name: node.name,
      loc: node.loc,
      classes: node.classes,
      recurringEvents: recurringEvents
    };
    return cb(err, nodeSpec);
  });
};

baseTracker.prototype.getNodes = function(cb) {
  var self = this;
  var nodes = Object.keys(this.nodes).map(function(key) {
    return self.nodes[key];
  });
  async.map(nodes, function(node, cb) {
    return self.getNode(node, cb);
  }, cb);
};

baseTracker.prototype.maybeEmitUpdate = function(node) {
  if (node.ready) {
    var self = this;
    this.getNode(node, function(err, node) {
      self.emit('update', [node]);
    });
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
  //this.eventsDB.remove({}, {multi: true}, function(){});
  var self = this;
  this.getNextEvents(function(err, nextEvents) {
    if (self.timerId) {
      clearTimeout(self.timerId);
      self.timerId = undefined;
    }
    if (nextEvents.length > 0) {
      console.log('next event happens ' + nextEvents[0].moment.fromNow());
      var timeUntilEvent = nextEvents[0].moment.diff(moment());
      self.timerId = setTimeout(function() {
        nextEvents.forEach(function(event) {
          self.setValue(event.nodeId, 37, 0, event.value);
        });
        self.timerId = undefined;
        self.scheduleNextEvent();
      }, timeUntilEvent); 
    }
  });
};

function getSuncalcTime(dateMoment, eventSpec) {
  // Suncalc uses julian dates, and julian dates start at noon.
  var date = new Date(dateMoment.year(), dateMoment.month(), dateMoment.date(), 12);
  return moment(suncalc.getTimes(date,
                                 eventSpec.latitude,
                                 eventSpec.longitude)[eventSpec.type]);
}

function getNextEventTime(eventSpec) {
  var now = moment();
  if (eventSpec.type === 'static') {
    var nextEventTime = moment().tz(eventSpec.tzName)
        .isoWeekday(eventSpec.weekday)
        .hour(eventSpec.hour)
        .minute(eventSpec.minute)
        .second(0)
        .millisecond(0);
    if (nextEventTime.isBefore(now)) {
      nextEventTime.add('weeks', 1);
    }
    return nextEventTime;
  } else if (eventSpec.type === 'sunrise' || eventSpec.type === 'sunset') {
    var nextDate = moment()
        .tz('HST')  // Hawaii has the last sunrise
        .isoWeekday(eventSpec.weekday)
        .endOf('day');
    for(var time = getSuncalcTime(nextDate, eventSpec);
        time.isBefore(now);
        nextDate.add('weeks', 1)) {
      time = getSuncalcTime(nextDate, eventSpec);
    }
    return time;
  }
}

baseTracker.prototype.getNextEvents = function(cb) {
  this.eventsDB.find({}, function(err, allEvents) {
    var futureEvents = allEvents.map(function(eventSpec) {
      return {
        moment: getNextEventTime(eventSpec),
        nodeId: eventSpec.nodeId,
        value: eventSpec.value
      };
    });
    // Sort the events by next occurrence.
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
      return cb(err, futureEvents);
    }
    return cb(err, []);
  });
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
  // sunrise and sunset base_id's are somewhat arbitrary, but avoid conflicts
  // with any statically configured recurring event.
  if (eventSpec.type === 'sunset' || eventSpec.type === 'sunrise') {
    var base_id = eventSpec.type === 'sunset' ? 2000 : 3000;
    var id = base_id + eventSpec.weekday*60*24;
    if ('addMinutes' in eventSpec) {
      return id + eventSpec.addMinutes;
    } else {
      return id;
    }
  } else if (eventSpec.type === 'static') {
    return 60*24*eventSpec.weekday + 60*eventSpec.hour + eventSpec.minute;
  }
  return -1;  // error
}

baseTracker.prototype.isRecurringEventValid = function(eventSpec) {
  // All events need a type and value.
  if ((!('type' in eventSpec)) || (!('value' in eventSpec))) {
    return false;
  }

  if (eventSpec.type === 'sunset' || eventSpec.type === 'sunrise') {
    if (eventSpec.addMinutes !== undefined &&
        (eventSpec.addMinutes > 1440 || eventSpec.addMinutes < -1440)) {
      return false;
    }
    return ['latitude', 'longitude'].every(function(x) {
      return x in eventSpec;
    });
  } else if (eventSpec.type === 'static') {
    return ['weekday', 'hour', 'minute', 'tzName'].every(function(x) {
      return x in eventSpec;
    });
  }
  // eventSpec.type not understood
  return false;
};

baseTracker.prototype.addRecurringEvent = function(nodeId, eventSpec) {
  var self = this;
  if (!self.isRecurringEventValid(eventSpec)) {
    console.log('Invalid recurring event');
    return;
  }
  self.eventsDB.remove({nodeId: nodeId, eventId: eventId(eventSpec)}, function(err, numRemoved) {
    var dbSpec = {
      type: eventSpec.type,
      nodeId: nodeId,
      eventId: eventId(eventSpec),
      weekday: eventSpec.weekday,
      value: eventSpec.value
    };
    if (eventSpec.type === 'sunrise' || eventSpec.type === 'sunset') {
      dbSpec.latitude = eventSpec.latitude;
      dbSpec.longitude = eventSpec.longitude;
      if (eventSpec.addMinutes) {
        dbSpec.addMinutes = eventSpec.addMinutes;
      }
    } else if (eventSpec.type === 'static') {
      dbSpec.hour = eventSpec.hour;
      dbSpec.minute = eventSpec.minute;
      dbSpec.tzName = eventSpec.tzName;
    } else {
      // Not valid.
      console.log('uhoh');
    }
    self.eventsDB.insert(dbSpec, function(err, savedEvent) {
      self.scheduleNextEvent();
      self.maybeEmitUpdate(self.nodes[nodeId]);
    });
  });
};

baseTracker.prototype.removeRecurringEvent = function(nodeId, eventId) {
  var self = this;
  self.eventsDB.remove({nodeId: nodeId, eventId: eventId}, function(err, numRemoved) {
    self.scheduleNextEvent();
    self.maybeEmitUpdate(self.nodes[nodeId]);
  });
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
    self.scheduleNextEvent();
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

