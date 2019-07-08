import { reverse } from 'ramda'
export const reflect = a => a

export const applyAsync = (acc,val) => acc.then(val);
export const pipeAsync = (...funcs) => x => funcs.reduce(applyAsync, Promise.resolve(x));
export const composeAsync = (...funcs) => x => reverse(funcs).reduce(applyAsync, Promise.resolve(x));


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