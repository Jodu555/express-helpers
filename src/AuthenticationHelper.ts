import fs from 'fs';
import { Application, NextFunction, Request, Response } from 'express';
import { AuthClassController } from './auth/authClassController';
import { generateUUID } from './utils';


interface OptionsObject {
	register: boolean;
	restrictedRegister: ((validation: object) => boolean) | null;
	allowMultipleSessions: boolean;
	authTokenStoreDatabase: boolean;
}

class AuthenticationHelper<U extends { UUID: string }> {
	app: Application;
	apiAuthPath: string;
	database: any;
	options: OptionsObject;
	additionalAccountColumns: object;
	additionalAccountRegisterSchema: object;
	tokens: Map<string, U>;
	onLogin?: (token: string, dbentry: U) => void;
	onRegister?: (userobj: U) => void;
	onAuthenticated?: (userobj: U) => void;
	constructor(
		app: Application,
		apiAuthPath: string,
		database: any,
		accountFile = false,
		additionalAccountColumns = {},
		additionalAccountRegisterSchema = {}
	) {
		this.app = app;
		this.apiAuthPath = apiAuthPath;
		this.database = database;
		this.options = { register: true, restrictedRegister: null, allowMultipleSessions: false, authTokenStoreDatabase: false };
		this.additionalAccountColumns = additionalAccountColumns;
		this.additionalAccountRegisterSchema = additionalAccountRegisterSchema;
		this.tokens = new Map();
	}
	install(onLogin = (token: string, userobj: U) => { }, onRegister = (userobj: U) => { }, onAuthenticated = (userobj: U) => { }) {
		this.onLogin = onLogin;
		this.onRegister = onRegister;
		this.onAuthenticated = onAuthenticated;
		this.database != null && this.setupDatabase();
		const authCLSController = new AuthClassController<U>(this);
		this.app.use(this.apiAuthPath, authCLSController.getRouter());

		// const { router, setAuthHelper } = require('./auth/index');
		// setAuthHelper(this);
		// this.app.use(this.apiAuthPath, router);
	}

	setupDatabase() {
		const len = {
			min: 3,
		};

		this.database.createTable('accounts', {
			options: {
				PK: 'UUID',
			},
			UUID: {
				type: 'varchar(64)',
				null: false,
			},
			username: {
				type: 'varchar(64)',
				null: false,
			},
			email: {
				type: 'varchar(64)',
				null: false,
			},
			password: {
				type: 'TEXT',
				null: false,
			},
			...this.additionalAccountColumns,
		});

		if (this.options.authTokenStoreDatabase) {
			this.database.createTable('authtokens', {
				options: {
					PK: 'TOKEN',
				},
				TOKEN: {
					type: 'varchar(64)',
					null: false,
				},
				UUID: {
					type: 'varchar(64)',
					null: false,
				},
			});
		}

		const registerSchema = {
			UUID: {
				value: generateUUID,
			},
			username: {
				required: true,
				anum: false,
				min: 3,
				max: 15,
			},
			email: {
				email: true,
				...len,
				max: 20,
			},
			password: {
				required: true,
				...len,
				max: 100,
			},
			...this.additionalAccountRegisterSchema,
		};

		const loginSchema = {
			username: {
				anum: false,
				max: 15,
				...len,
			},
			password: {
				...len,
				max: 100,
			},
		};

		this.database.registerSchema('registerSchema', registerSchema, 'accounts');
		this.database.registerSchema('loginSchema', loginSchema, 'accounts');
	}
	async addToken(token: string, user: U) {
		if (!this.options.allowMultipleSessions) {
			if (this.options.authTokenStoreDatabase) {
				const exist = this.database.get('authtokens').getOne({ UUID: user.UUID });
				if (exist) {
					await this.removeToken(exist.TOKEN);
				}
			} else {
				this.tokens.forEach(async (value, key) => {
					if (JSON.stringify(value) == JSON.stringify(user)) {
						await this.removeToken(key);
					}
				});
			}
		}
		if (this.options.authTokenStoreDatabase) {
			await this.database.get('authtokens').create({ TOKEN: token, UUID: user.UUID });
		} else {
			this.tokens.set(token, user);
		}
	}

	async removeToken(token: string) {
		if (this.options.authTokenStoreDatabase) {
			await this.database.get('authtokens').delete({ TOKEN: token });
		} else {
			this.tokens.delete(token);
		}
	}

	async getUser(token: string): Promise<U> {
		let user = undefined;
		if (this.options.authTokenStoreDatabase) {
			const search = await this.database.get('authtokens').getOne({ TOKEN: token });
			if (search) {
				user = await this.database.get('accounts').getOne({ UUID: search.UUID });
			}
		} else {
			user = this.tokens.get(token);
		}
		if (user) delete user.password;
		return user;
	}

	authentication() {
		return this.authenticationFull(() => true);
	}

	authenticationFull(cb: (user: U) => boolean) {
		return async (req: AuthenticatedRequest<U>, res: Response, next: NextFunction) => {
			const token = (req.headers['auth-token'] as string) || (req.query['auth-token'] as string);
			if (token) {
				if (await this.getUser(token)) {
					const user = await this.getUser(token);
					if (!cb || cb(user)) {
						req.credentials = {
							token,
							user,
						};
						this.onAuthenticated?.(user);
						next();
						return;
					} else {
						next(new AuthenticationError('Insufficent Permission'));
					}
				} else {
					next(new AuthenticationError('Invalid auth-token'));
				}
			} else {
				next(new AuthenticationError('Missing auth-token in headers'));
			}
		};
	}
}

export interface AuthenticatedRequest<U> extends Request {
	credentials?: {
		token: string;
		user: U;
	};
}

class AuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export { AuthenticationHelper, AuthenticationError };
