const path = require('path');
const pkg = require('./package.json');

const webpack = require('webpack');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const buildPath = path.resolve(__dirname, 'dist');

module.exports = {
  devtool: 'source-map',
  entry: {
    telechart: './src/index.js'
  },
  output: {
    filename: '[name].[hash:20].js',
    path: buildPath
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
          name: 'telechart-2.[hash].js'
        }
      },
      {
        test: /\.(scss|css|sass)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            // translates CSS into CommonJS
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          {
            // Runs compiled CSS through postcss for vendor prefixing
            loader: 'postcss-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'sass-loader',
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
              name: '[name].[hash:20].[ext]',
              limit: 8192
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: 'body',
    }),
    new CleanWebpackPlugin(buildPath),
    new FaviconsWebpackPlugin({
      logo: './assets/telechart@512px.png',
      prefix: 'icons-[hash]/',
      persistentCache: true,
      // Inject the html into the html-webpack-plugin
      inject: true,
      background: '#fff',
      title: 'telechart',

      icons: {
        android: true,
        appleIcon: true,
        appleStartup: true,
        coast: false,
        favicons: true,
        firefox: true,
        opengraph: true,
        twitter: true,
        yandex: true,
        windows: false
      }
    }),
    new MiniCssExtractPlugin({
      filename: 'telechart.[contenthash].css'
    }),
    new OptimizeCssAssetsPlugin({
      cssProcessor: require('cssnano'),
      cssProcessorOptions: {
        map: {
          inline: false,
        },
        discardComments: {
          removeAll: true
        }
      },
      canPrint: true
    }),
    new webpack.DefinePlugin({
      TELECHART_NAME: JSON.stringify( pkg.name ),
      TELECHART_VERSION: JSON.stringify( pkg.version ),
      TELECHART_AUTHOR: JSON.stringify( pkg.author ),
    })
  ]
};
