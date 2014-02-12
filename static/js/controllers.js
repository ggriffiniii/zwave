var zwaveControllers = angular.module('zwaveControllers', []);

zwaveControllers.controller('zwaveMainCtrl', ['$scope', 'socket',
    function($scope, socket) {
        $scope.nodes = {};

        $scope.toggleNode = function(nodeId) {
            var node = $scope.nodes[nodeId];
            socket.emit('setValue', {
                nodeId: nodeId,
                commandClass: 37,
                valueId: 0,
                value: !node.classes[37][0].value
            });
        }
        socket.on('nodes', function(nodes) {
            $scope.nodes = nodes;
        });

        socket.on('node_update', function(updated_nodes) {
            angular.forEach(updated_nodes, function(value, key) {
                if (key in $scope.nodes) {
                    angular.copy(value, $scope.nodes[key]);
                } else {
                    $scope.nodes[key] = angular.copy(value);
                }
            });
        });
    }
]);
