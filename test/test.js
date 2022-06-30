const express = require('express');

const { AuthenticationHelper, ErrorHelper } = require('../src/index');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('localhost', 'root', '', 'testhelpers');
database.connect();

const app = express();
app.use(express.json());

const authHelper = new AuthenticationHelper(app, '/auth', database);
authHelper.options.register = false;
authHelper.install();

authHelper.addToken('test', { UUID: 'dsudfhsuifbdgi', name: 'Jodu' })


const errorHelper = new ErrorHelper()
app.use(errorHelper.install());



app.listen(3100, () => console.log('Server listening'));