'use strict';
/* global moment */

angular.module('zwaveApp')
  .filter('eventDesc', function () {
    return function (eventSpec) {
      if (eventSpec.type === 'static') {
        return moment().tz(eventSpec.tzName)
            .isoWeekday(eventSpec.weekday)
            .hour(eventSpec.hour)
            .minute(eventSpec.minute)
            .startOf('minute')
            .local()
            .format('dddd at LT');
      } else {
        var desc = '';
        if (eventSpec.addMinutes) {
          if (eventSpec.addMinutes > 0) {
            desc += eventSpec.addMinutes + ' minutes after ';
          } else if (eventSpec.addMinutes < 0) {
            desc += eventSpec.addMinutes + ' minutes before ';
          }
        }
        return desc + eventSpec.type + ' on ' + moment().isoWeekday(eventSpec.weekday).format('dddd');
      }
    };
  });
