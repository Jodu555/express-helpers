import express, { Request, Response } from 'express';
import { AuthenticationHelper, ErrorHelper } from '../src/index';

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase('localhost', 'root', '', 'testhelpers');
database.connect();

const app = express();
app.use(express.json());

const authHelper = new AuthenticationHelper(app, '/auth', database, false, {
	settings: 'varchar(64)',
	lastLogin: 'TEXT',
});
authHelper.options.register = true;
// authHelper.options.restrictedRegister = (validation) => {
// 	console.log(validation);
// 	if (validation.success) {
// 		if (validation.object.token == 'secretOTP') {
// 			delete validation.object.token;
// 			return true;
// 		}
// 	}
// 	return false;
// };
authHelper.options.authTokenStoreDatabase = true;

authHelper.install(
	async (token, dbentry) => {
		//Update lastLogin Time
		console.log('onLogin', token, dbentry);
		await database.get('accounts').update(
			{
				UUID: dbentry.UUID,
			},
			{
				lastLogin: Date.now(),
			}
		);
	},
	async (userobj) => {
		console.log('onRegister', userobj);
		//Maybe fill in programmatically any fields
		await database.get('accounts').update(
			{
				UUID: userobj.UUID,
			},
			{
				settings: JSON.stringify({ test: 124, devMode: false, initLang: 'GerDub' }),
				lastLogin: Date.now(),
			}
		);
	},
	async (req, userobj) => {
		console.log('OnAuthenticated', userobj);
		console.log(req.ip, req.ips, req.socket.address());
	}
);

const errorHelper = new ErrorHelper();

app.get('/', authHelper.authentication(), (req: Request, res: Response) => {
	res.json('Auth Route');
});

app.use(errorHelper.install());

app.listen(3200, () => console.log('Server listening'));
