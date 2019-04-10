const path = require('path');
const pkg = require('./package.json');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: 'eval-cheap-module-source-map',
  entry: {
    telechart: './src/index.js',
    demo: './demo/index.js'
  },
  devServer: {
    port: 8080,
    contentBase: path.join(__dirname, "dist"),
    disableHostCheck: true
  },
  node: {
    fs: 'empty'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', {
              "loose": true
            }]
          ]
        }
      },
      {
        test: /\.worker\.js$/,
        loader: 'worker-loader',
        options: {
          inline: true,
          fallback: true,
          name: 'telechart2.[hash].js'
        }
      },
      {
        test: /\.(scss|css)$/,
        use: [
          {
            // creates style nodes from JS strings
            loader: "style-loader",
            options: {
              sourceMap: true
            }
          },
          {
            // translates CSS into CommonJS
            loader: "css-loader",
            options: {
              sourceMap: true
            }
          },
          {
            // compiles Sass to CSS
            loader: "sass-loader",
            options: {
              outputStyle: 'expanded',
              sourceMap: true,
              sourceMapContents: true
            }
          }
        ]
      },
      {
        // Load all images as base64 encoding if they are smaller than 8192 bytes
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              // On development we want to see where the file is coming from, hence we preserve the [path]
              name: '[path][name].[ext]?hash=[hash:20]',
              limit: 8192
            }
          }
        ]
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: true
    }),
    new webpack.DefinePlugin({
      TELECHART_NAME: JSON.stringify( pkg.name ),
      TELECHART_VERSION: JSON.stringify( pkg.version ),
      TELECHART_AUTHOR: JSON.stringify( pkg.author ),
    })
  ]
};
