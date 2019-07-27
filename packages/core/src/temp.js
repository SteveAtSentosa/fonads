// TODO: implmenet placeholders
// adds fonad operator tags as specified to final and all partially curriend functions
// opts {
//   fonadQuery: 'query name': tag paertial and final functions with fonadQuery = 'query name'
//   fonadUpdater: 'updater name': tag paertial and final functions with fonadUpdater = 'updater name'
//}
export function fCurry(fn, opts={}) {
  var args = [].slice.call(arguments)
  var typeOfFn = typeof fn
  const { fonadQuery, fonadUpdater } = opts

  if (typeOfFn !== 'function' ) throw new Error('auto-curry: Invalid parameter. Expected function, received ' + typeOfFn)
  if (fn.length <= 1) {
    fonadQuery && (fn.fonadQuery = fonadQuery)
    fonadUpdater && (fn.fonadUpdater = fonadUpdater)
    return fn
  }
  if (args.length - 1 >= fn.length) {
    const fnToReturn = fn.apply(this, args.slice(1))
    console.log('typeof fnToReturn: ', typeof fnToReturn)
    fonadQuery && (fnToReturn.fonadQuery = fonadQuery)
    fonadUpdater && (fnToReturn.fonadUpdater = fonadUpdater)
    return fnToReturn
  }
  const fnToReturn = function() {
    return fCurry.apply(this, args.concat([].slice.call(arguments)), opts)
  };
  fonadQuery && (fnToReturn.fonadQuery = fonadQuery)
  fonadUpdater && (fnToReturn.fonadUpdater = fonadUpdater)
  return fnToReturn
};
