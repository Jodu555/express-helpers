const express = require('express');

const { middleware } = require('../src/index');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('localhost', 'root', '', 'testhelpers');

const app = express();

app.use(middleware({
    app,
    apiAuthPath: '/api/auth',
    database,
}))



app.listen(3000, () => console.log('Server listening'));