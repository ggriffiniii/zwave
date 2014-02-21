'use strict';
/* global moment */

angular.module('zwaveApp')
  .filter('eventTime', function () {
    return function (input, format) {
      return moment().tz(input.tzName)
          .isoWeekday(input.weekday)
          .hour(input.hour)
          .minute(input.minute)
          .second(0)
          .millisecond(0)
          .local()
          .format(format);
    };
  });
