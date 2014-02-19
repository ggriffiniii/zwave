'use strict';

var zwaveApp = angular.module('zwaveApp');

zwaveApp.controller('NodeListCtrl', ['$scope',
  function ($scope) {
  }
]);

zwaveApp.controller('NodeDetailCtrl', ['$scope', '$routeParams',
  function ($scope, $routeParams) {
    $scope.nodeid = Number($routeParams.nodeId);

    $scope.weekday = 0;
    $scope.hour = 0;
    $scope.minute = 0;
    $scope.value = true;

    $scope.addEvent = function() {
      var event = {
        weekday: Number($scope.weekday),
        hour: Number($scope.hour),
        minute: Number($scope.minute),
        value: Boolean($scope.value)
      };
      $scope.nodes[$scope.nodeid].recurringEvents.push(event);
      Socket.emit('setRecurringEvents', {
        nodeId: $scope.nodeid,
        recurringEvents: $scope.nodes[$scope.nodeid].recurringEvents
      });
    };
  }
]);
