/*
Project Name: Food Factory App
Written By: Jeffrey Daniel Raja V
Date : 25-12-2020
*/
//Required the node modules
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const bodyParser = require('body-parser');
var app = express();
//requireing the api's from routes
var login = require('./routes/login');
var user_op = require('./routes/user_operations');
var reset_password = require('./routes/resetpassword');
var food_order = require('./routes/food_order');
var get_food = require('./routes/get_food');
var get_ingredients = require('./routes/get_ingredients');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/foodfac/login', login);
app.use('/foodfac/user_operations', user_op);
app.use('/foodfac/resetpassword', reset_password);
app.use('/foodfac/food_order', food_order);
app.use('/foodfac/get_food', get_food);
app.use('/foodfac/get_ingredients', get_ingredients);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

module.exports = app;