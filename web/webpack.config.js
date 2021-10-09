const path = require('path');

module.exports = {
  entry: './src/geojson.js',
  output: {
    filename: 'geojson.js',
    path: path.resolve(__dirname, 'dist')
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
