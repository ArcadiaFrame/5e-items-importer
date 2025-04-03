const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    main: './scripts/module.js',
    'pdf.worker': 'pdfjs-dist/build/pdf.worker.entry'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname),
    publicPath: 'modules/5e-items-importer/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader']
      }
    ]
  },
  plugins: [
    // Copy Tesseract.js worker and language data
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/tesseract.js/dist/worker.min.js',
          to: 'tesseract-worker.js'
        },
        {
          from: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
          to: 'tesseract-core.js'
        },
        // English language data for Tesseract
        {
          from: 'node_modules/tesseract.js/lang/eng.traineddata.gz',
          to: 'lang/eng.traineddata.gz'
        }
      ]
    })
  ],
  // Don't bundle these libraries as they'll be available in Foundry
  externals: {
    jquery: 'jQuery'
  },
  // Development settings
  mode: 'development',
  devtool: 'source-map'
};