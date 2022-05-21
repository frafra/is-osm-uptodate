const path = require('path');
const webpack = require('webpack');
const SentryWebpackPlugin = require("@sentry/webpack-plugin");

module.exports = (env) => {
  let conf = {
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
  devtool: "source-map",
  plugins: [
    new webpack.DefinePlugin({
      SENTRY_DSN: JSON.stringify(process.env.SENTRY_DSN),
      RELEASE: JSON.stringify(require('./package.json').version),
    }),
  ],
  };
  if (process.env.SENTRY_AUTH_TOKEN) {
    let sentryWebpackPlugin = new SentryWebpackPlugin({
      // sentry-cli configuration - can also be done directly through sentry-cli
      // see https://docs.sentry.io/product/cli/configuration/ for details
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: require('./package.json').name,
      release: require('./package.json').version,

      // other SentryWebpackPlugin configuration
      include: ".",
      ignore: ["node_modules", "webpack.config.js"],
    });
    conf.plugins.push(sentryWebpackPlugin);
  }
  return conf;
};
