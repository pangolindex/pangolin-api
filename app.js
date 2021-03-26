const express = require('express');
const logger = require('morgan');
const path = require('path')
const rfs = require('rotating-file-stream')
const helmet = require('helmet')

const indexRouter = require('./routes/index');
const pngRouter = require('./routes/png');
const pangolinRouter = require('./routes/pangolin');

const app = express();
app.use(helmet())

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// create a rotating write stream
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: path.join(__dirname, 'log')
})

app.use(logger('combined', { stream: accessLogStream }))

app.use('/', indexRouter);
app.use('/png', pngRouter);
app.use('/pangolin', pangolinRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
})

// catch 500
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

module.exports = app;
