import express, { NextFunction, Request, Response, Router } from 'express';
import { AuthenticatedRequest, AuthenticationHelper } from '../AuthenticationHelper';
import { generateUUID } from '../utils';
const bcrypt = require('bcryptjs');

export class AuthClassController<U extends { UUID: string }> {
	authHelper: AuthenticationHelper<U>;
	database: any;
	constructor(authHelper: AuthenticationHelper<U>) {
		this.authHelper = authHelper;
		this.database = this.authHelper.database;
	}

	getRouter(): Router {
		// console.log(this);

		const router = express.Router();
		router.get('/', (req: Request, res: Response) => {
			res.json({ message: 'Auth-Router works just fine' });
		});

		this.authHelper.options.register &&
			router.post('/register', (req: Request, res: Response, next: NextFunction) => {
				this.register(req, res, next);
			});

		router.post('/login', (req: AuthenticatedRequest<U>, res: Response, next: NextFunction) => {
			this.login(req, res, next);
		});

		router.get('/logout', this.authHelper.authentication(), (req: AuthenticatedRequest<U>, res: Response, next: NextFunction) => {
			this.logout(req, res, next);
		});

		router.get('/info', this.authHelper.authentication(), (req: AuthenticatedRequest<U>, res: Response, next: NextFunction) => {
			this.info(req, res, next);
		});
		return router;
	}

	async register(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const validation = this.database.getSchema('registerSchema').validate(req.body, true);
			const user = validation.object;

			let restrictedResult = false;

			if (typeof this.authHelper.options.restrictedRegister == 'function') {
				restrictedResult = this.authHelper.options.restrictedRegister(validation);
				if (!restrictedResult) {
					next(new Error('Restricted Registration!'));
					return;
				}
			}

			const search = { ...user }; //Spreading to disable the reference
			delete search.password;
			search.unique = false;
			const result = await this.database.get('accounts').get(search);
			if (result.length == 0) {
				user.password = await bcrypt.hash(user.password, 8);
				await this.database.get('accounts').create(user);
				await this.authHelper.onRegister?.(user);

				delete user.password;
				res.json(user);
			} else {
				next(new Error('The email or the username is already taken!'));
			}
		} catch (error) {
			next(error);
		}
	}

	async login(req: AuthenticatedRequest<U>, res: Response<any, Record<string, any>>, next: NextFunction) {
		try {
			const validation = this.database.getSchema('loginSchema').validate(req.body, true);
			const user = validation.object;
			const result = await this.database.get('accounts').get({ username: user.username, unique: true });
			if (result.length > 0) {
				if (await bcrypt.compare(user.password, result[0].password)) {
					const token = generateUUID();
					delete result[0].password;
					this.authHelper.addToken(token, result[0]);
					await this.authHelper.onLogin?.(token, result[0]);
					res.json({ token });
				} else {
					next(new Error('Invalid password!'));
				}
			} else {
				const value = user.username ? 'username' : 'email';
				next(new Error('Invalid ' + value + '!'));
			}
		} catch (error) {
			next(error);
		}
	}

	async logout(req: AuthenticatedRequest<U>, res: Response, next: NextFunction) {
		const token = req.credentials?.token as string;
		this.authHelper.removeToken(token);
		res.json({ message: 'Successfully logged out!' });
	}

	info(req: AuthenticatedRequest<U>, res: Response, next: NextFunction) {
		try {
			res.json(req.credentials?.user);
		} catch (error) {
			next(error);
		}
	}
}
