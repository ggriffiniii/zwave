'use strict';
/* global io */

var zwaveApp = angular.module('zwaveApp');

zwaveApp.factory('Socket', ['$rootScope',
  function($rootScope) {
    var socket = io.connect();
    var socketService = {};

    socketService.on = function(eventName, cb) {
      socket.on(eventName, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          cb.apply(socket, args);
        });
      });
    };

    socketService.emit = function(eventName, data, cb) {
      socket.emit(eventName, data, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          if (cb) {
            cb.apply(socket, args);
          }
        });
      });
    };

    return socketService;
  }
]);
