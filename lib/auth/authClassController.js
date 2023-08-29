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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthClassController = void 0;
const express_1 = __importDefault(require("express"));
const utils_1 = require("../utils");
const bcrypt = require('bcryptjs');
class AuthClassController {
    constructor(authHelper) {
        this.authHelper = authHelper;
        this.database = this.authHelper.database;
    }
    getRouter() {
        // console.log(this);
        const router = express_1.default.Router();
        router.get('/', (req, res) => {
            res.json({ message: 'Auth-Router works just fine' });
        });
        this.authHelper.options.register &&
            router.post('/register', (req, res, next) => {
                this.register(req, res, next);
            });
        router.post('/login', (req, res, next) => {
            this.login(req, res, next);
        });
        router.get('/logout', this.authHelper.authentication(), (req, res, next) => {
            this.logout(req, res, next);
        });
        router.get('/info', this.authHelper.authentication(), (req, res, next) => {
            this.info(req, res, next);
        });
        return router;
    }
    register(req, res, next) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
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
                const search = Object.assign({}, user); //Spreading to disable the reference
                delete search.password;
                search.unique = false;
                const result = yield this.database.get('accounts').get(search);
                if (result.length == 0) {
                    user.password = yield bcrypt.hash(user.password, 8);
                    yield this.database.get('accounts').create(user);
                    yield ((_b = (_a = this.authHelper).onRegister) === null || _b === void 0 ? void 0 : _b.call(_a, user));
                    delete user.password;
                    res.json(user);
                }
                else {
                    next(new Error('The email or the username is already taken!'));
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    login(req, res, next) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const validation = this.database.getSchema('loginSchema').validate(req.body, true);
                const user = validation.object;
                const result = yield this.database.get('accounts').get({ username: user.username, unique: true });
                if (result.length > 0) {
                    if (yield bcrypt.compare(user.password, result[0].password)) {
                        const token = (0, utils_1.generateUUID)();
                        delete result[0].password;
                        this.authHelper.addToken(token, result[0]);
                        yield ((_b = (_a = this.authHelper).onLogin) === null || _b === void 0 ? void 0 : _b.call(_a, token, result[0]));
                        res.json({ token });
                    }
                    else {
                        next(new Error('Invalid password!'));
                    }
                }
                else {
                    const value = user.username ? 'username' : 'email';
                    next(new Error('Invalid ' + value + '!'));
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    logout(req, res, next) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const token = (_a = req.credentials) === null || _a === void 0 ? void 0 : _a.token;
            this.authHelper.removeToken(token);
            res.json({ message: 'Successfully logged out!' });
        });
    }
    info(req, res, next) {
        var _a;
        try {
            res.json((_a = req.credentials) === null || _a === void 0 ? void 0 : _a.user);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthClassController = AuthClassController;
