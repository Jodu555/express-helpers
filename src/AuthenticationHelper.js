const { generateUUID } = require('./utils');

class AuthenticationHelper {
    constructor(app, apiAuthPath, database, additionalAccountColumns = {}, additionalAccountRegisterSchema = {}) {
        this.app = app;
        this.apiAuthPath = apiAuthPath;
        this.database = database;
        this.additionalAccountColumns = additionalAccountColumns;
        this.additionalAccountRegisterSchema = additionalAccountRegisterSchema;
        this.tokens = new Map();
    }
    install() {
        this.setupDatabase()
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

    addToken(token, user) {
        this.tokens.forEach((value, key) => {
            if (JSON.stringify(value) == JSON.stringify(user)) {
                this.tokens.delete(key);
            }
        });
        this.tokens.set(token, user);
    }

    removeToken(token) {
        this.tokens.delete(token);
    }

    getUser(token) {
        return this.tokens.get(token);
    }

    authentication() {
        return this.authenticationFull(() => true);
    }

    authenticationFull(cb) {
        return (req, res, next) => {
            const token = req.headers['auth-token'];
            if (token) {
                if (this.getUser(token)) {
                    const user = this.getUser(token);
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