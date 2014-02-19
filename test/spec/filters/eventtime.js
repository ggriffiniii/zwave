'use strict';

describe('Filter: eventTime', function () {

  // load the filter's module
  beforeEach(module('zwaveApp'));

  // initialize a new instance of the filter before each test
  var eventTime;
  beforeEach(inject(function ($filter) {
    eventTime = $filter('eventTime');
  }));

  it('should return the input prefixed with "eventTime filter:"', function () {
    var text = 'angularjs';
    expect(eventTime(text)).toBe('eventTime filter: ' + text);
  });

});
