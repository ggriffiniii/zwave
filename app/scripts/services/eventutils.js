'use strict';
/* global moment */
/* global SunCalc */

angular.module('zwaveApp')
  .service('Eventutils', function Eventutils() {
    function getSunCalcTime(dateMoment, eventSpec) {
      // Suncalc uses julian dates, and julian dates start at noon.
      var date = new Date(dateMoment.year(), dateMoment.month(), dateMoment.date(), 12);
      return moment(SunCalc.getTimes(date,
                                     eventSpec.latitude,
                                     eventSpec.longitude)[eventSpec.type]);
    }

    this.getNextEventMoment = function(eventSpec) {
      var now = moment();
      if (eventSpec.type === 'static') {
        var nextEventTime = moment().tz(eventSpec.tzName)
            .isoWeekday(eventSpec.weekday)
            .hour(eventSpec.hour)
            .minute(eventSpec.minute)
            .second(0)
            .millisecond(0);
        if (nextEventTime.isBefore(now)) {
          nextEventTime.add('weeks', 1);
        }
        return nextEventTime;
      } else if (eventSpec.type === 'sunrise' || eventSpec.type === 'sunset') {
        var nextDate = moment()
            .tz('HST')  // Hawaii has the last sunrise
            .isoWeekday(eventSpec.weekday)
            .endOf('day');
        for(var time = getSunCalcTime(nextDate, eventSpec);
            time.isBefore(now);
            nextDate.add('weeks', 1)) {
          time = getSunCalcTime(nextDate, eventSpec);
        }
        return time;
      }
    };
  });
