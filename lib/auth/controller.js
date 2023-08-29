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
const utils_1 = require("../utils");
const fs = require('fs');
const bcrypt = require('bcryptjs');
let database;
let authHelper;
function setAuthHelper(h) {
    authHelper = h;
    database = h.database;
    const register = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a;
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
            const search = Object.assign({}, user); //Spreading to disable the reference
            delete search.password;
            search.unique = false;
            const result = yield database.get('accounts').get(search);
            if (result.length == 0) {
                user.password = yield bcrypt.hash(user.password, 8);
                yield database.get('accounts').create(user);
                yield ((_a = authHelper.onRegister) === null || _a === void 0 ? void 0 : _a.call(authHelper, user));
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
    const login = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _b;
        try {
            const validation = database.getSchema('loginSchema').validate(req.body, true);
            const user = validation.object;
            const result = yield database.get('accounts').get({ username: user.username, unique: true });
            if (result.length > 0) {
                if (yield bcrypt.compare(user.password, result[0].password)) {
                    const token = (0, utils_1.generateUUID)();
                    delete result[0].password;
                    authHelper.addToken(token, result[0]);
                    yield ((_b = authHelper.onLogin) === null || _b === void 0 ? void 0 : _b.call(authHelper, token, result[0]));
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
    const logout = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _c;
        const token = (_c = req.credentials) === null || _c === void 0 ? void 0 : _c.token;
        authHelper.removeToken(token);
        res.json({ message: 'Successfully logged out!' });
    });
    const info = (req, res, next) => {
        var _a;
        try {
            res.json((_a = req.credentials) === null || _a === void 0 ? void 0 : _a.user);
        }
        catch (error) {
            next(error);
        }
    };
    return { register, login, logout, info };
}
module.exports = {
    setAuthHelper,
};
