var OZW = require('openzwave');
var util = require('util');
var events = require('events');

var Tracker = function() {
  var self = this;
  events.EventEmitter.call(self);
  self.scanComplete = false;
  self.nodes = {};
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

util.inherits(Tracker, events.EventEmitter);

Tracker.prototype.getNodes = function() {
  var nodes = [];
  if (this.scanComplete) {
    for (var key in this.nodes) {
      nodes.push(this.nodes[key]);
    }
  }
  return nodes;
};

Tracker.prototype.maybeEmitUpdate = function(node) {
  if (node.ready) {
      this.emit('update', [node]);
  }
};

Tracker.prototype.start = function(node) {
  this.zwave.connect();
};

Tracker.prototype.stop = function(node) {
  this.zwave.disconnect();
  this.nodes = {};
  this.scanComplete = false;
};

Tracker.prototype.setValue = function(nodeid, commandClass, index, value) {
  this.zwave.setValue(nodeid, commandClass, index, value);
};

module.exports = Tracker;
