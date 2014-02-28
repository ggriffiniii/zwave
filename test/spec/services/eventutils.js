'use strict';

describe('Service: Eventutils', function () {

  // load the service's module
  beforeEach(module('zwaveApp'));

  // instantiate service
  var Eventutils;
  beforeEach(inject(function (_Eventutils_) {
    Eventutils = _Eventutils_;
  }));

  it('should do something', function () {
    expect(!!Eventutils).toBe(true);
  });

});
