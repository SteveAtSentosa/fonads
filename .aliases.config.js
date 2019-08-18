/* Used by webpack, babel and eslint */

const { resolve } = require('path');

const getPackageSourcePath = packageName =>
  resolve(__dirname, `packages/${packageName}/src`);

module.exports = {
  '@fonads/core': getPackageSourcePath('core'),
};
