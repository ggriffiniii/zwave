'use strict';
/* global moment */
/* global Intl */

var zwaveApp = angular.module('zwaveApp');

zwaveApp.controller('NodeListCtrl', [
  function() { console.log('not used yet'); }
]);

zwaveApp.controller('NodeDetailCtrl', ['$scope', '$routeParams', 'Socket',
  function ($scope, $routeParams, Socket) {
    $scope.nodeId = Number($routeParams.nodeId);

    $scope.newStaticEvent = {
      weekday: 0,
    };
    $scope.newSunriseEvent = {
      weekday: 0,
      beforeAfter: 'before',
    };
    $scope.newSunsetEvent = {
      weekday: 0,
      beforeAfter: 'before',
    };

    $scope.timeUntilNextEvent = function(recurringEvent) {
      var now = moment();
      var nextEventTime = moment().tz(recurringEvent.tzName)
          .isoWeekday(recurringEvent.weekday)
          .hour(recurringEvent.hour)
          .minute(recurringEvent.minute)
          .second(0)
          .millisecond(0);
      if (nextEventTime.isBefore(now)) {
        nextEventTime.add('weeks', 1);
      }
      return nextEventTime.diff(now);
    };

    $scope.addEvent = function() {
      var tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var newEventTime = moment()
          .weekday($scope.newEvent.weekday)
          .hour($scope.newEvent.hour)
          .minute($scope.newEvent.minute)
          .second(0)
          .millisecond(0);
      var eventSpec = {
        type: 'static',
        weekday: newEventTime.isoWeekday(),
        hour: newEventTime.hour(),
        minute: newEventTime.minute(),
        tzName: tzName,
        value: Boolean($scope.newEvent.value)
      };
      Socket.emit('addRecurringEvent', {
        nodeId: $scope.nodeId,
        eventSpec: eventSpec
      });
    };

    $scope.removeEvent = function(eventId) {
      Socket.emit('removeRecurringEvent', {
        nodeId: $scope.nodeId,
        eventId: eventId
      });
    };
  }
]);
