const webpack = require('webpack');
   const path = require('path');
   const HtmlWebpackPlugin = require('html-webpack-plugin');
   const { InjectManifest } = require('workbox-webpack-plugin'); 
   const packageJson = require('./package.json');

   module.exports = {
     entry: './src/index.js',
     output: {
       path: path.resolve(__dirname, 'build'),
       filename: 'bundle.js'
     },
     module: {
       rules: [
         {
           test: /\.js$/,
           exclude: /node_modules/,
           use: {
             loader: 'babel-loader'
           }
         }
       ]
     },
     plugins: [
       new webpack.DefinePlugin({
         'process.env.VERSION': packageJson.version
       }),
       new HtmlWebpackPlugin({
         template: './public/index.html'
       }),
       new InjectManifest({
         swSrc: './src/worker.js',
         swDest: 'service-worker.js'
       })
     ]
   };