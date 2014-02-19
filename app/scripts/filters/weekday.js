'use strict';

angular.module('zwaveApp')
  .filter('weekday', function () {
    return function (input) {
      return moment().weekday(input).format('dddd');
    };
  });
