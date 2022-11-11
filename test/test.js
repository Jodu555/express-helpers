const express = require('express');

const { AuthenticationHelper, ErrorHelper } = require('../src/index');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('localhost', 'root', '', 'testhelpers');
database.connect();

const app = express();
app.use(express.json());

const authHelper = new AuthenticationHelper(app, '/auth', database, false, {
    settings: 'varchar(64)',
    lastLogin: 'TEXT'
});
authHelper.options.register = false;
authHelper.install((token, dbentry) => {
    //Update lastLogin Time
    console.log('onLogin', token, dbentry);
}, (userobj) => {
    console.log('onRegister', userobj);
    //Maybe fill in programmatically any fields
});

authHelper.addToken('test', { UUID: 'dsudfhsuifbdgi', name: 'Jodu' })


const errorHelper = new ErrorHelper()
app.use(errorHelper.install());



app.listen(3100, () => console.log('Server listening'));