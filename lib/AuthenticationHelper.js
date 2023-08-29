"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = exports.AuthenticationHelper = void 0;
const authClassController_1 = require("./auth/authClassController");
const fs = require('fs');
const { generateUUID } = require('./utils');
class AuthenticationHelper {
    constructor(app, apiAuthPath, database, accountFile = false, additionalAccountColumns = {}, additionalAccountRegisterSchema = {}) {
        this.app = app;
        this.apiAuthPath = apiAuthPath;
        this.database = database;
        this.options = { register: true, restrictedRegister: null, allowMultipleSessions: false, authTokenStoreDatabase: false };
        this.additionalAccountColumns = additionalAccountColumns;
        this.additionalAccountRegisterSchema = additionalAccountRegisterSchema;
        this.tokens = new Map();
    }
    install(onLogin = (token, userobj) => { }, onRegister = (userobj) => { }) {
        this.onLogin = onLogin;
        this.onRegister = onRegister;
        this.database != null && this.setupDatabase();
        const authCLSController = new authClassController_1.AuthClassController(this);
        this.app.use(this.apiAuthPath, authCLSController.getRouter());
        // const { router, setAuthHelper } = require('./auth/index');
        // setAuthHelper(this);
        // this.app.use(this.apiAuthPath, router);
    }
    setupDatabase() {
        const len = {
            min: 3,
        };
        this.database.createTable('accounts', Object.assign({ options: {
                PK: 'UUID',
            }, UUID: {
                type: 'varchar(64)',
                null: false,
            }, username: {
                type: 'varchar(64)',
                null: false,
            }, email: {
                type: 'varchar(64)',
                null: false,
            }, password: {
                type: 'TEXT',
                null: false,
            } }, this.additionalAccountColumns));
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
        const registerSchema = Object.assign({ UUID: {
                value: generateUUID,
            }, username: {
                required: true,
                anum: false,
                min: 3,
                max: 15,
            }, email: Object.assign(Object.assign({ email: true }, len), { max: 20 }), password: Object.assign(Object.assign({ required: true }, len), { max: 100 }) }, this.additionalAccountRegisterSchema);
        const loginSchema = {
            username: Object.assign({ anum: false, max: 15 }, len),
            password: Object.assign(Object.assign({}, len), { max: 100 }),
        };
        this.database.registerSchema('registerSchema', registerSchema, 'accounts');
        this.database.registerSchema('loginSchema', loginSchema, 'accounts');
    }
    addToken(token, user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.options.allowMultipleSessions) {
                if (this.options.authTokenStoreDatabase) {
                    const exist = this.database.get('authtokens').getOne({ UUID: user.UUID });
                    if (exist) {
                        yield this.removeToken(exist.TOKEN);
                    }
                }
                else {
                    this.tokens.forEach((value, key) => __awaiter(this, void 0, void 0, function* () {
                        if (JSON.stringify(value) == JSON.stringify(user)) {
                            yield this.removeToken(key);
                        }
                    }));
                }
            }
            if (this.options.authTokenStoreDatabase) {
                yield this.database.get('authtokens').create({ TOKEN: token, UUID: user.UUID });
            }
            else {
                this.tokens.set(token, user);
            }
        });
    }
    removeToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.authTokenStoreDatabase) {
                yield this.database.get('authtokens').delete({ TOKEN: token });
            }
            else {
                this.tokens.delete(token);
            }
        });
    }
    getUser(token) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = undefined;
            if (this.options.authTokenStoreDatabase) {
                const search = yield this.database.get('authtokens').getOne({ TOKEN: token });
                if (search) {
                    user = yield this.database.get('accounts').getOne({ UUID: search.UUID });
                }
            }
            else {
                user = this.tokens.get(token);
            }
            if (user)
                delete user.password;
            return user;
        });
    }
    authentication() {
        return this.authenticationFull(() => true);
    }
    authenticationFull(cb) {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const token = req.headers['auth-token'] || req.query['auth-token'];
            if (token) {
                if (yield this.getUser(token)) {
                    const user = yield this.getUser(token);
                    if (!cb || cb(user)) {
                        req.credentials = {
                            token,
                            user,
                        };
                        next();
                        return;
                    }
                    else {
                        next(new AuthenticationError('Insufficent Permission'));
                    }
                }
                else {
                    next(new AuthenticationError('Invalid auth-token'));
                }
            }
            else {
                next(new AuthenticationError('Missing auth-token in headers'));
            }
        });
    }
}
exports.AuthenticationHelper = AuthenticationHelper;
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AuthenticationError = AuthenticationError;
