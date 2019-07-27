import { reverse } from 'ramda'
import { isFunction } from 'ramda-adjunct'
export const reflect = a => a

export const applyAsync = (acc,val) => acc.then(val);
export const pipeAsync = (...funcs) => x => funcs.reduce(applyAsync, Promise.resolve(x));
export const composeAsync = (...funcs) => x => reverse(funcs).reduce(applyAsync, Promise.resolve(x));



// adapted from https://github.com/fp-js/fj-curry/blob/master/index.js
const tagFn = (fn, opts) => {
  if (isFunction(fn)) {
    const { fonadQuery, fonadUpdater } = opts
    if (fonadQuery) fn.fonadQuery = fonadQuery
    if (fonadUpdater) fn.fonadUpdater = fonadUpdater

  }
  return fn
}

export function fCurry(fn, opts = {}) {
  var _curry = function (n, fn) {
    var slice = Array.prototype.slice;
    var curryArgs = arguments[2] === undefined ? [] : arguments[2];
    let fnToReturn = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      var concatArgs = curryArgs.concat(args);
      if (n > concatArgs.length) {
        let fnToReturn = _curry(n, fn, concatArgs);
        return tagFn(fnToReturn, opts)
      } else {
        let fnToReturn = fn.apply(null, slice.call(concatArgs, 0, n));
        return tagFn(fnToReturn, opts)
      }
    };
    return tagFn(fnToReturn, opts)
  };
  let fnToReturn = _curry(fn.length, fn);
  return tagFn(fnToReturn, opts)
}



// from here: https://github.com/jperasmus/pipe-then
// export function pipeAsync() {
//   for (var _len = arguments.length, functions = Array(_len), _key = 0; _key < _len; _key++) {
//     functions[_key] = arguments[_key];
//   }

//   return function(input) {
//     return functions.reduce(function(chain, func) {
//       return chain.then(func);
//     }, Promise.resolve(input));
//   };
// };