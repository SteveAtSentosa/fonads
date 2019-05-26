//const UglifyWebpackPlugin = require("uglifyjs-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  entry: {
    app: './src/fonads.js',
  },
  output: {
    library: 'fonads.min.js',
    libraryTarget: 'umd',
    globalObject: "typeof self !== 'undefined' ? self : this",
  },
  // module: {
  //   rules: [{
  //     test: /\.js$/,
  //     exclude: /node_modules/,
  //     loader: 'babel-loader',
  //     query: {
  //       presets: ['es2015'],
  //     }
  //   }]
  // },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          query: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  optimization: {
    // minimizer: [new UglifyWebpackPlugin()]
    minimizer: [new TerserPlugin()],
  }
}
