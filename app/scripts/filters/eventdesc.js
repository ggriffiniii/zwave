'use strict';
/* global moment */

angular.module('zwaveApp')
  .filter('eventDesc', function () {
    return function (eventSpec) {
      var desc = 'Every ';
      if (eventSpec.type === 'static') {
        var t = moment().tz(eventSpec.tzName)
            .isoWeekday(eventSpec.weekday)
            .hour(eventSpec.hour)
            .minute(eventSpec.minute)
            .startOf('minute')
            .local();
        desc += t.format('dddd') + ' at ' + t.format('LT');
      } else {
        desc += moment().isoWeekday(eventSpec.weekday).format('dddd') + ' at ';
        if (eventSpec.addMinutes) {
          if (eventSpec.addMinutes > 0) {
            desc += eventSpec.addMinutes + ' minutes after ';
          } else if (eventSpec.addMinutes < 0) {
            desc += Math.abs(eventSpec.addMinutes) + ' minutes before ';
          }
        }
        desc += eventSpec.type;
      }
      return desc;
    };
  });
