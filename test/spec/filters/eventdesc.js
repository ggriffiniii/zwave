'use strict';

describe('Filter: eventDesc', function () {

  // load the filter's module
  beforeEach(module('zwaveApp'));

  // initialize a new instance of the filter before each test
  var eventDesc;
  beforeEach(inject(function ($filter) {
    eventDesc = $filter('eventDesc');
  }));

  it('should return the input prefixed with "eventDesc filter:"', function () {
    var text = 'angularjs';
    expect(eventDesc(text)).toBe('eventDesc filter: ' + text);
  });

});
