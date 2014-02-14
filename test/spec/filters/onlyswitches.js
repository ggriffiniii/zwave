'use strict';

describe('Filter: onlyswitches', function () {

  // load the filter's module
  beforeEach(module('zwaveApp'));

  // initialize a new instance of the filter before each test
  var onlyswitches;
  beforeEach(inject(function ($filter) {
    onlyswitches = $filter('onlyswitches');
  }));

  it('should return the input prefixed with "onlyswitches filter:"', function () {
    var text = 'angularjs';
    expect(onlyswitches(text)).toBe('onlyswitches filter: ' + text);
  });

});
