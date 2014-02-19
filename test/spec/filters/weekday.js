'use strict';

describe('Filter: weekday', function () {

  // load the filter's module
  beforeEach(module('zwaveApp'));

  // initialize a new instance of the filter before each test
  var weekday;
  beforeEach(inject(function ($filter) {
    weekday = $filter('weekday');
  }));

  it('should return the input prefixed with "weekday filter:"', function () {
    var text = 'angularjs';
    expect(weekday(text)).toBe('weekday filter: ' + text);
  });

});
