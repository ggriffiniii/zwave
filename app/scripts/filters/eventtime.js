'use strict';
/* global moment */

angular.module('zwaveApp')
  .filter('eventTime', function () {
    return function (input) {
      return moment().utc()
          .hour(input.hour).minute(input.minute)
          .local().format('LT');
    };
  });
