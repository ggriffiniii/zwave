var OZW = require('openzwave');
var util = require('util');
var events = require('events');

var Tracker = function() {
    events.EventEmitter.call(this);
    this.scanComplete = false;
    this.nodes = {};
    this.zwave = new OZW('/dev/ttyUSB0', {
        saveconfig: true
    });
    this.zwave.on('driver failed', function() {
        this.zwave.disconnect();
        this.emit('failed');
    });
    this.zwave.on('scan complete', function() {
        this.scanComplete = true;
        this.emit('ready');
    });
    this.zwave.on('node added', function(nodeid) {
        this.nodes[nodeid] = {
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
    this.zwave.on('value added', function(nodeid, klass, value) {
        var node = this.nodes[nodeid];
        if (!node.classes[klass])
            node.classes[klass] = {};
        node.classes[klass][value.index] = value;
        this.maybeEmitUpdate(node);
    });
    this.zwave.on('value changed', function(nodeid, klass, value) {
        var node = this.nodes[nodeid];
        node.classes[klass][value.index] = value;
        this.maybeEmitUpdate(node);
    });
    this.zwave.on('value removed', function(nodeid, klass, index) {
        var node = this.nodes[nodeid];
        if (node.classes[klass] && node.classes[klass][index]) {
            delete node.classes[klass][index];
            this.maybeEmitUpdate(node);
        }
    });
    this.zwave.on('node ready', function(nodeid, nodeinfo) {
        var node = this.nodes[nodeid];
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
                    this.zwave.enablePoll(nodeid, klass);
                    break;
            }
        }
        this.maybeEmitUpdate(node);
    });
};

util.inherits(Tracker, events.EventEmitter);

Tracker.prototype.getNodes = function() {
    var nodes = [];
    if (this.scanComplete) {
        for (var key in this.nodes) {
            nodes.append(this.nodes[key]);
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
