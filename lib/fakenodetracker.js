var util = require('util');
var events = require('events');

function createFakeSwitch(nodeid) {
    return {
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
        ready: true
    };
}

var Tracker = function() {
    events.EventEmitter.call(this);
    this.scanComplete = false;
    this.nodes = {};
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
    this.nodes[1] = createFakeSwitch(1);
    this.nodes[33] = createFakeSwitch(33);
    this.nodes[90] = createFakeSwitch(90);
    this.scanComplete = true;
    this.emit('ready');
    var self = this;
    this.intervalId = setInterval(function() {
      self._toggleRandomSwitch();
    }, 10000);
};

Tracker.prototype.stop = function(node) {
    this.clearInterval(this.intervalId);
    this.nodes = {};
    this.scanComplete = false;
};

Tracker.prototype.setValue = function(nodeid, commandClass, index, value) {
    var node = this.nodes[nodeid];
    if (commandClass in node.classes && index in node.classes[commandClass]) {
      node.classes[commandClass][index].value = value;
      this.maybeEmitUpdate(node);
    }
};

Tracker.prototype._toggleRandomSwitch = function() {
  var nodeIds = Object.keys(this.nodes);
  var nodeCount = nodeIds.length;
  var randomIndex = Math.floor(Math.random() * nodeCount);
  var randomNodeId = nodeIds[randomIndex];
  var randomNode = this.nodes[randomNodeId];
  var currentValue = randomNode.classes[37][0].value;
  this.setValue(randomNodeId, 37, 0, !currentValue);
};

module.exports = Tracker;
