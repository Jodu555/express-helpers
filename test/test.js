const express = require('express');

const { AuthenticationHelper } = require('../src/index');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('localhost', 'root', '', 'testhelpers');

const app = express();

const authHelper = new AuthenticationHelper(app, '/api/auth', database);
authHelper.install();



app.listen(3000, () => console.log('Server listening'));