'use strict';

describe('Directive: onOffToggle', function () {

  // load the directive's module
  beforeEach(module('zwaveApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<on-off-toggle></on-off-toggle>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the onOffToggle directive');
  }));
});
