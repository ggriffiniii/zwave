'use strict';
/* global moment */

angular.module('zwaveApp')
  .filter('weekday', function () {
    return function (input) {
      return moment().isoWeekday(input).format('dddd');
    };
  });
