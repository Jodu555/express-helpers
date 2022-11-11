const fs = require('fs');
const { generateUUID } = require('./utils');

class AuthenticationHelper {
    /**
     * @param  {Object} app
     * @param  {String} apiAuthPath
     * @param  {Object} database
     * @param  {Boolean} accountFile=false
     * @param  {Object} additionalAccountColumns={}
     * @param  {Object} additionalAccountRegisterSchema={}
     */
    constructor(app, apiAuthPath, database, accountFile = false, additionalAccountColumns = {}, additionalAccountRegisterSchema = {}) {
        this.app = app;
        this.apiAuthPath = apiAuthPath;
        this.database = database;
        this.options = { register: true, allowMultipleSessions: false, authTokenStoreDatabase: false };
        this.additionalAccountColumns = additionalAccountColumns;
        this.additionalAccountRegisterSchema = additionalAccountRegisterSchema;
        this.tokens = new Map();
    }
    install(onLogin = () => { }, onRegister = () => { }) {
        this.onLogin = onLogin;
        this.onRegister = onRegister;
        this.database != null && this.setupDatabase()
        const { router, setAuthHelper } = require('./auth/index');
        setAuthHelper(this);
        this.app.use(this.apiAuthPath, router);
    }

    setupDatabase() {
        const len = {
            min: 3,
        }

        this.database.createTable('accounts', {
            options: {
                PK: 'UUID',
            },
            'UUID': {
                type: 'varchar(64)',
                null: false,
            },
            'username': {
                type: 'varchar(64)',
                null: false,
            },
            'email': {
                type: 'varchar(64)',
                null: false,
            },
            'password': {
                type: 'TEXT',
                null: false,
            },
            ...this.additionalAccountColumns
        });

        if (this.options.authTokenStoreDatabase) {
            this.database.createTable('authtokens', {
                options: {
                    PK: 'TOKEN',
                },
                'TOKEN': {
                    type: 'varchar(64)',
                    null: false,
                },
                'UUID': {
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
                ...len,
                max: 100,
            },
            ...this.additionalAccountRegisterSchema
        };

        const loginSchema = {
            username: {
                anum: false,
                max: 15,
                ...len
            },
            password: {
                ...len,
                max: 100,
            },
        }

        this.database.registerSchema('registerSchema', registerSchema, 'accounts');
        this.database.registerSchema('loginSchema', loginSchema, 'accounts');
    }
    /**
     * @param  {String} token
     * @param  {Object} user
     */
    async addToken(token, user) {
        if (!this.options.allowMultipleSessions) {
            if (this.options.authTokenStoreDatabase) {
                const exist = this.database.get('authtokens').getOne({ UUID: user.UUID });
                if (exist) {
                    await this.removeToken(exist.TOKEN)
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
    /**
     * @param  {String} token
     */
    async removeToken(token) {
        if (this.options.authTokenStoreDatabase) {
            await this.database.get('authtokens').delete({ TOKEN: token });
        } else {
            this.tokens.delete(token);
        }
    }

    /**
     * @param  {String} token
     */
    async getUser(token) {
        let user = undefined;
        if (this.options.authTokenStoreDatabase) {
            const search = await this.database.get('authtokens').getOne({ TOKEN: token });
            if (search) {
                user = await this.database.get('accounts').getOne({ UUID: search.UUID });
            }
        } else {
            user = this.tokens.get(token);
        }
        if (user)
            delete user.password;
        return user;
    }

    authentication() {
        return this.authenticationFull(() => true);
    }

    authenticationFull(cb) {
        return async (req, res, next) => {
            const token = req.headers['auth-token'] || req.query['auth-token'];
            if (token) {
                if (await this.getUser(token)) {
                    const user = await this.getUser(token);
                    if (!cb || cb(user)) {
                        req.credentials = {
                            token,
                            user,
                        };
                        next();
                        return;
                    } else {
                        next(new AuthenticationError('Insufficent Permission'))
                    }
                } else {
                    next(new AuthenticationError('Invalid auth-token'))
                }
            } else {
                next(new AuthenticationError('Missing auth-token in headers'));
            }
        }
    }
}

class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { AuthenticationHelper, AuthenticationError };