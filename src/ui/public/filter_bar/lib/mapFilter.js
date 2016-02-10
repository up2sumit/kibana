import _ from 'lodash';
import GenerateMappingChainProvider from './generateMappingChain';
import MapMatchAllProvider from './mapMatchAll';
import MapTermsProvider from './mapTerms';
import MapRangeProvider from './mapRange';
import MapExistsProvider from './mapExists';
import MapMissingProvider from './mapMissing';
import MapQueryStringProvider from './mapQueryString';
import MapGeoBoundingBoxProvider from './mapGeoBoundingBox';
import MapScriptProvider from './mapScript';
import MapDefaultProvider from './mapDefault';
export default function mapFilterProvider(Promise, Private) {

  var generateMappingChain = Private(GenerateMappingChainProvider);

  /** Mappers **/

  // Each mapper is a simple promise function that test if the mapper can
  // handle the mapping or not. If it handles it then it will resolve with
  // and object that has the key and value for the filter. Otherwise it will
  // reject it with the original filter. We had to go down the promise interface
  // because mapTerms and mapRange need access to the indexPatterns to format
  // the values and that's only available through the field formatters.

  // The mappers to apply. Each mapper will either return
  // a result object with a key and value attribute or
  // undefined. If undefined is return then the next
  // mapper will get the opportunity to map the filter.
  // To create a new mapper you just need to create a function
  // that either handles the mapping operation or not
  // and add it here. ProTip: These are executed in order listed
  var mappers = [
    Private(MapMatchAllProvider),
    Private(MapTermsProvider),
    Private(MapRangeProvider),
    Private(MapExistsProvider),
    Private(MapMissingProvider),
    Private(MapQueryStringProvider),
    Private(MapGeoBoundingBoxProvider),
    Private(MapScriptProvider),
    Private(MapDefaultProvider)
  ];

  var noop = function () {
    return Promise.reject(new Error('No mappings have been found for filter.'));
  };

  // Create a chain of responsibility by reducing all the
  // mappers down into one function.
  var mapFn = _.reduceRight(mappers, function (memo, map) {
    var filterChainFn = generateMappingChain(map);
    return filterChainFn(memo);
  }, noop);

  /**
   * Map the filter into an object with the key and value exposed so it's
   * easier to work with in the template
   * @param {object} fitler The filter the map
   * @returns {Promise}
   */
  return function (filter) {
    // Apply the mapping function
    return mapFn(filter).then(function (result) {
      filter.meta = filter.meta || {};
      filter.meta.key = result.key;
      filter.meta.value = result.value;
      filter.meta.disabled = !!(filter.meta.disabled);
      filter.meta.negate = !!(filter.meta.negate);
      filter.meta.alias = filter.meta.alias || null;
      return filter;
    });
  };
};
