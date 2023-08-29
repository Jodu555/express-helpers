"use strict";
const express = require('express');
const controller = require('./controller');
const router = express.Router();
let authHelper;
const setAuthHelper = (h) => {
    authHelper = h;
    controller.setAuthHelper(h);
    router.get('/', (req, res) => {
        res.json({ message: 'Auth-Router works just fine' });
    });
    authHelper.options.register && router.post('/register', controller.register);
    router.post('/login', controller.login);
    router.get('/logout', authHelper.authentication(), controller.logout);
    router.get('/info', authHelper.authentication(), controller.info);
};
module.exports = {
    router,
    setAuthHelper,
};
