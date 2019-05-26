import { reverse } from 'ramda'
export const reflect = a => a

export const applyAsync = (acc,val) => acc.then(val);
export const pipeAsync = (...funcs) => x => funcs.reduce(applyAsync, Promise.resolve(x));
export const composeAsync = (...funcs) => x => reverse(funcs).reduce(applyAsync, Promise.resolve(x));

