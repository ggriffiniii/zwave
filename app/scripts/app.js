'use strict';

var zwaveApp = angular.module('zwaveApp', [
  'ngRoute',
  'ui.bootstrap'
]);

zwaveApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/nodes', {
        templateUrl: 'views/nodes.html',
        controller: 'NodeListCtrl'
      }).
      when('/nodes/:nodeId', {
        templateUrl: 'views/node-detail.html',
        controller: 'NodeDetailCtrl'
      }).
      otherwise({
        redirectTo: '/nodes'
      });
  }
]);
