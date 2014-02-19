'use strict';

var zwaveApp = angular.module('zwaveApp');

zwaveApp.filter('onlyswitches', function() {
  return function(nodes) {
    var switches = {};
    angular.forEach(nodes, function(nodeinfo, nodeId) {
      if (37 in nodeinfo.classes) {
        switches[nodeId] = nodeinfo;
      }
    });
    return switches;
  };
});
