const path = require('path');

module.exports = {
  entry: './src/geojson.js',
  output: {
    filename: 'geojson.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        secure: false,
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
