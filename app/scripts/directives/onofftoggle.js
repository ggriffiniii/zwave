'use strict';

angular.module('zwaveApp')
  .directive('onOffToggle', function () {
    return {
      templateUrl: 'views/onofftoggle.html',
      restrict: 'E',
      scope: {
        disabled: '=',
        value: '=',
        click: '&onClick'
      },
    };
  });
