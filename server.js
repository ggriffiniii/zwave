var OZW = require('openzwave');
var zwave = new OZW('/dev/ttyUSB0', {
    saveconfig: true
});
var nodes = {};
var io;
function send_update(nodeid, nodeinfo) {
    if (io && nodeinfo.ready) {
        var update = {};
        update[nodeid] = nodeinfo;
        io.sockets.emit('node_update', update);
    }
}

zwave.on('driver ready', function(homeid) {
    console.log('scanning homeid=0x%s...', homeid.toString(16));
});

zwave.on('driver failed', function() {
    console.log('failed to start driver');
    zwave.disconnect();
    process.exit();
});

zwave.on('node added', function(nodeid) {
    nodes[nodeid] = {
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


zwave.on('value added', function(nodeid, klass, value) {
    var node = nodes[nodeid];
    if (!node.classes[klass])
        node.classes[klass] = {};
    node.classes[klass][value.index] = value;
    send_update(nodeid, node);
});

zwave.on('value changed', function(nodeid, klass, value) {
    var node = nodes[nodeid];
    node.classes[klass][value.index] = value;
    send_update(nodeid, node);
});

zwave.on('value removed', function(nodeid, klass, index) {
    var node = nodes[nodeid];
    if (node.classes[klass] && node.classes[klass][index]) {
        delete node.classes[klass][index];
        send_update(nodeid, node);
    }
});

zwave.on('node ready', function(nodeid, nodeinfo) {
    node = nodes[nodeid];
    node.manufacturer = nodeinfo.manufacturer;
    node.manufacturerid = nodeinfo.manufacturerid;
    node.product = nodeinfo.product;
    node.producttype = nodeinfo.producttype;
    node.productid = nodeinfo.productid;
    node.type = nodeinfo.type;
    node.name = nodeinfo.name;
    node.loc = nodeinfo.loc;
    node.ready = true;
    for (klass in node.classes) {
        switch (klass) {
            case 0x25:  // COMMAND_CLASS_SWITCH_BINARY
            case 0x26:  // COMMAND_CLASS_SWITCH_MULTILEVEL
                zwave.enablePoll(nodeid, klass);
                break;
        }
    }
    send_update(nodeid, nodes[nodeid]);
});

zwave.on('scan complete', function() {
    var express = require('express');
    var server = express();
    var port = 8002;

    server.use(express.static(__dirname + '/static'));
    io = require('socket.io').listen(server.listen(port));
    console.log('Listening on port ' + port);
    io.configure(function() {
        io.enable('browser client minification');
        io.enable('browser client etag');
        io.enable('browser client gzip');
        io.set('log level', 1);
        io.set('transports', [
            'websocket',
            'htmlfile',
            'xhr-polling',
            'jsonp-polling'
        ]);
    });

    io.sockets.on('connection', function(socket) {
        socket.emit('nodes', nodes);
        socket.on('setValue', function(data) {
            zwave.setValue(data.nodeId, data.commandClass, data.valueId, data.value);
        });
    });
});

zwave.connect();

