const express = require('express');

const { AuthenticationHelper } = require('../src/index');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('localhost', 'root', '', 'testhelpers');
database.connect();

const app = express();

const authHelper = new AuthenticationHelper(app, '/auth', database);
authHelper.install();



app.listen(3100, () => console.log('Server listening'));