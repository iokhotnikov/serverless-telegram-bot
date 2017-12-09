const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    handler: ['./handler.js']
  },
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [{
      test: /\.js$/,
      include: __dirname,
      exclude: /node_modules/,
      use: [{ loader: 'babel-loader' }]
    }]
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js'
  }
};
