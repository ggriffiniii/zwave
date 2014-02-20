'use strict';
/* global moment */

angular.module('zwaveApp')
  .filter('eventTime', function () {
    return function (input, format) {
      return moment().utc()
          .isoWeekday(input.weekday)
          .hour(input.hour)
          .minute(input.minute)
          .local()
          .format(format);
    };
  });
