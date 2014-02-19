'use strict';

angular.module('zwaveApp')
  .filter('eventTime', function () {
    return function (input) {
      return moment()
          .hour(input.hour).minute(input.minute).format('LT');
    };
  });
