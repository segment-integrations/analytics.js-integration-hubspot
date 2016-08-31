'use strict';

/**
 * Module dependencies.
 */

var convert = require('@segment/convert-dates');
var integration = require('@segment/analytics.js-integration');
var push = require('global-queue')('_hsq');
var each = require('@ndhoule/each');

/**
 * Expose `HubSpot` integration.
 */

var HubSpot = module.exports = integration('HubSpot')
  .assumesPageview()
  .global('_hsq')
  .option('portalId', null)
  .tag('<script id="hs-analytics" src="https://js.hs-analytics.net/analytics/{{ cacheBuster }}/{{ portalId }}.js">');

/**
 * Initialize.
 *
 * @api public
 */

HubSpot.prototype.initialize = function() {
  window._hsq = [];
  var cacheBuster = Math.ceil(new Date() / 300000) * 300000;
  this.load({ cacheBuster: cacheBuster }, this.ready);
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

HubSpot.prototype.loaded = function() {
  return !!(window._hsq && window._hsq.push !== Array.prototype.push);
};

/**
 * Page.
 *
 * @api public
 * @param {Page} page
 */

HubSpot.prototype.page = function() {
  push('trackPageView');
};

/**
 * Identify.
 *
 * @api public
 * @param {Identify} identify
 */

HubSpot.prototype.identify = function(identify) {
  if (!identify.email()) return;
  var traits = identify.traits({ firstName: 'firstname', lastName: 'lastname' });
  traits = convertDates(traits);
  traits = formatTraits(traits);
  push('identify', traits);
};

/**
 * Track.
 *
 * @api public
 * @param {Track} track
 */

HubSpot.prototype.track = function(track) {
  // Hubspot expects properties.id to be the name of the .track() event
  // Ref: http://developers.hubspot.com/docs/methods/enterprise_events/javascript_api
  var props = convertDates(track.properties({ id: '_id', revenue: 'value' }));
  props.id = track.event();

  push('trackEvent', track.event(), props);
};

/**
 * Convert all the dates in the HubSpot properties to millisecond times
 *
 * @api private
 * @param {Object} properties
 */

function convertDates(properties) {
  return convert(properties, function(date) { return date.getTime(); });
}

/**
 * lowercase & snakecase any trait with uppercase letters or spaces
 * Hubspot cannot accept uppercases or spaces
 *
 * @api private
 * @param {Object} traits
 * @return {Object} ret
 */

function formatTraits(traits) {
  var ret = {};
  each(function(value, key) {
    var k = key.toLowerCase().replace(/\s/g, '_');
    ret[k] = value;
  }, traits);

  return ret;
}
