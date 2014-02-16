'use strict';

var zwaveApp = angular.module('zwaveApp');

zwaveApp.controller('MainCtrl', ['$scope', 'Socket',
  function ($scope, Socket) {
    $scope.nodes = {};

    $scope.setName = function(nodeId) {
      var node = $scope.nodes[nodeId];
      Socket.emit('setName', {
        nodeId: nodeId,
        name: node.name
      });
    };

    $scope.setLocation = function(nodeId) {
      var node = $scope.nodes[nodeId];
      Socket.emit('setLocation', {
        nodeId: nodeId,
        location: node.loc
      });
    };

    $scope.toggleNode = function(nodeId) {
      var node = $scope.nodes[nodeId];
      Socket.emit('setValue', {
        nodeId: nodeId,
        commandClass: 37,
        valueId: 0,
        value: !node.classes[37][0].value
      });
    };

    Socket.on('update', function(nodes) {
      console.log(nodes);
      angular.forEach(nodes, function(node) {
        if (node.id in $scope.nodes) {
          angular.copy(node, $scope.nodes[node.id]);
        } else {
          $scope.nodes[node.id] = angular.copy(node);
        }
      });
      console.log($scope.nodes);
    });
  }
]);
