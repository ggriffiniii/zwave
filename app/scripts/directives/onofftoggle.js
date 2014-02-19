'use strict';

angular.module('zwaveApp')
  .directive('onOffToggle', function () {
    return {
      templateUrl: 'scripts/directives/onofftoggle.html',
      restrict: 'E',
      scope: {
        value: '=',
        click: '&onClick'
      },
    };
  });
