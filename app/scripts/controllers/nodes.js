'use strict';
/* global moment */
/* global Intl */

var homeLat = '47.722530';
var homeLong = '-122.330333';

var zwaveApp = angular.module('zwaveApp');

zwaveApp.controller('NodeListCtrl', [
  function() { console.log('not used yet'); }
]);

zwaveApp.controller('NodeDetailCtrl', ['$scope', '$routeParams', 'Socket',
  function ($scope, $routeParams, Socket) {
    $scope.nodeId = Number($routeParams.nodeId);

    $scope.newStaticEvent = {
      weekday: 0,
      time: moment().startOf('hour').add('hour', 1).toDate(),
      value: true
    };
    $scope.newSunriseEvent = {
      weekday: 0,
      beforeAfter: 'before',
      offsetMin: 0,
      value: true
    };
    $scope.newSunsetEvent = {
      weekday: 0,
      beforeAfter: 'before',
      offsetMin: 0,
      value: true
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

    function addEvent(eventSpec) {
      Socket.emit('addRecurringEvent', {
        nodeId: $scope.nodeId,
        eventSpec: eventSpec
      });
    }

    $scope.addStaticEvent = function() {
      var tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var newEventTime = moment()
          .weekday($scope.newStaticEvent.weekday)
          .hour($scope.newStaticEvent.time.getHours())
          .minute($scope.newStaticEvent.time.getMinutes())
          .second(0)
          .millisecond(0);
      var eventSpec = {
        type: 'static',
        weekday: newEventTime.isoWeekday(),
        hour: newEventTime.hour(),
        minute: newEventTime.minute(),
        tzName: tzName,
        value: Boolean($scope.newStaticEvent.value)
      };
      addEvent(eventSpec);
    };

    $scope.addSunriseEvent = function() {
      var addMin = $scope.newSunriseEvent.offsetMin;
      if ($scope.newSunriseEvent.beforeAfter === 'before') {
        addMin = -addMin;
      }
      var eventSpec = {
        type: 'sunrise',
        weekday: $scope.newSunriseEvent.weekday,
        addMinutes: addMin,
        latitude: homeLat,
        longitude: homeLong,
        value: Boolean($scope.newSunriseEvent.value)
      };
      addEvent(eventSpec);
    };

    $scope.addSunsetEvent = function() {
      var addMin = $scope.newSunsetEvent.offsetMin;
      if ($scope.newSunsetEvent.beforeAfter === 'before') {
        addMin = -addMin;
      }
      var eventSpec = {
        type: 'sunset',
        weekday: $scope.newSunsetEvent.weekday,
        addMinutes: addMin,
        latitude: homeLat,
        longitude: homeLong,
        value: Boolean($scope.newSunsetEvent.value)
      };
      addEvent(eventSpec);
    };

    $scope.removeEvent = function(eventId) {
      Socket.emit('removeRecurringEvent', {
        nodeId: $scope.nodeId,
        eventId: eventId
      });
    };
  }
]);
