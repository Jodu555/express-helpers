import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest, AuthenticationHelper } from '../AuthenticationHelper';
import { generateUUID } from '../utils';
const fs = require('fs');
const bcrypt = require('bcryptjs');

let database: any;
let authHelper: AuthenticationHelper<any>;

function setAuthHelper<U extends { UUID: string }>(h: AuthenticationHelper<U>) {
	authHelper = h;
	database = h.database;

	const register = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const validation = database.getSchema('registerSchema').validate(req.body, true);
			const user = validation.object;

			let restrictedResult = false;

			if (typeof authHelper.options.restrictedRegister == 'function') {
				restrictedResult = authHelper.options.restrictedRegister(validation);
				if (!restrictedResult) {
					next(new Error('Restricted Registration!'));
					return;
				}
			}

			const search = { ...user }; //Spreading to disable the reference
			delete search.password;
			search.unique = false;
			const result = await database.get('accounts').get(search);
			if (result.length == 0) {
				user.password = await bcrypt.hash(user.password, 8);
				await database.get('accounts').create(user);
				await authHelper.onRegister?.(user);

				delete user.password;
				res.json(user);
			} else {
				next(new Error('The email or the username is already taken!'));
			}
		} catch (error) {
			next(error);
		}
	};

	const login = async (req: AuthenticatedRequest<any>, res: Response<any, Record<string, any>>, next: NextFunction) => {
		try {
			const validation = database.getSchema('loginSchema').validate(req.body, true);
			const user = validation.object;
			const result = await database.get('accounts').get({ username: user.username, unique: true });
			if (result.length > 0) {
				if (await bcrypt.compare(user.password, result[0].password)) {
					const token = generateUUID();
					delete result[0].password;
					authHelper.addToken(token, result[0]);
					await authHelper.onLogin?.(token, result[0]);
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
	};

	const logout = async (req: AuthenticatedRequest<any>, res: Response, next: NextFunction) => {
		const token = req.credentials?.token as string;
		authHelper.removeToken(token);
		res.json({ message: 'Successfully logged out!' });
	};

	const info = (req: AuthenticatedRequest<any>, res: Response, next: NextFunction) => {
		try {
			res.json(req.credentials?.user);
		} catch (error) {
			next(error);
		}
	};

	return { register, login, logout, info };
}

export = {
	setAuthHelper,
};
