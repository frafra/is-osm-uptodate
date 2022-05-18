const path = require('path');

module.exports = (env) => { return {
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    proxy: {
      '/api': {
        target: env.BACKEND_URL || 'http://localhost:8000',
        secure: false,
      },
      '/tiles': {
        target: env.BACKEND_URL || 'http://localhost:8000',
        secure: false,
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
  resolve:{
      alias: {
          'mapbox-gl': 'maplibre-gl',
      }
  }
}};
