module.exports = function main(tracker) {
    tracker.on('failed', function() {
        console.log('failed to start driver');
        process.exit();
    });

    tracker.on('ready', function() {
        var express = require('express');
        var server = express();
        var port = process.env.PORT;

        if (process.env.NODE_ENV === 'fake' ||
            process.env.NODE_ENV === 'dev') {
          server.use(express.static(__dirname + '/../app'));
        } else {
          server.use(express.static(__dirname + '/../dist'));
        }
        var io = require('socket.io').listen(server.listen(port));
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
        tracker.on('update', function(nodes) {
            io.sockets.emit('update', nodes);
        });

        io.sockets.on('connection', function(socket) {
            socket.emit('update', tracker.getNodes());
            socket.on('setValue', function(data) {
                tracker.setValue(data.nodeId, data.commandClass, data.valueId, data.value);
            });
        });
    });

    tracker.start();
};
