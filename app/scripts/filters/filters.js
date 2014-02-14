'use strict';

var zwaveApp = angular.module('zwaveApp');

zwaveApp.filter('onlyswitches', function() {
  return function(nodes) {
    var switches = {};
    angular.forEach(nodes, function(nodeinfo, nodeid) {
      if (37 in nodeinfo.classes) {
        switches[nodeid] = nodeinfo;
      }
    });
    return switches;
  };
});
