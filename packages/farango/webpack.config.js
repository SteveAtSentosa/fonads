// const UglifyWebpackPlugin = require('uglifyjs-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')


module.exports = {
  entry: {
    app: './src/farango.js',
  },
  output: {
    library: "farango.min.js",
    libraryTarget: "umd",
    globalObject: "typeof self !== 'undefined' ? self : this"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
    ],
  },
  optimization: {
    minimizer: [new TerserPlugin()],
  },
}
