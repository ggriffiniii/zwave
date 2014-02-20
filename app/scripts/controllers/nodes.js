'use strict';
/* global moment */

var zwaveApp = angular.module('zwaveApp');

zwaveApp.controller('NodeListCtrl', [
  function() { console.log('not used yet'); }
]);

zwaveApp.controller('NodeDetailCtrl', ['$scope', '$routeParams', 'Socket',
  function ($scope, $routeParams, Socket) {
    $scope.nodeId = Number($routeParams.nodeId);

    function initEventValues() {
      $scope.weekday = 0;
      $scope.hour = 0;
      $scope.minute = 0;
      $scope.value = true;
    }
    initEventValues();

    $scope.addEvent = function() {
      var newEventTime = moment()
          .weekday($scope.weekday)
          .hour($scope.hour)
          .minute($scope.minute)
          .second(0)
          .millisecond(0);
      // Use UTC when sending to server.
      newEventTime.utc();
      var eventSpec = {
        weekday: newEventTime.isoWeekday(),
        hour: newEventTime.hour(),
        minute: newEventTime.minute(),
        value: Boolean($scope.value)
      };
      Socket.emit('addRecurringEvent', {
        nodeId: $scope.nodeId,
        eventSpec: eventSpec
      });
      initEventValues();
    };

    $scope.removeEvent = function(eventId) {
      Socket.emit('removeRecurringEvent', {
        nodeId: $scope.nodeId,
        eventId: eventId
      });
    };
  }
]);
