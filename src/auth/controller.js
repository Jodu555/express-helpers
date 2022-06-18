let database;
let authHelper = null;
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils');

const setAuthHelper = (h) => {
    authHelper = h;
    database = h.database;
};

const register = async (req, res, next) => {
    try {
        const validation = database.getSchema('registerSchema').validate(req.body, true);
        const user = validation.object

        const search = { ...user }; //Spreading to disable the reference
        delete search.password;
        search.unique = false;
        const result = await database.get('accounts').get(search);
        if (result.length == 0) {
            user.password = await bcrypt.hash(user.password, 8);
            await database.get('accounts').create(user);

            delete user.password;
            res.json(user);
        } else {
            next(new Error('The email or the username is already taken!'));
        }
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const validation = database.getSchema('loginSchema').validate(req.body, true);
        const user = validation.object;
        const result = await database.get('accounts').get({ username: user.username, unique: true });
        if (result.length > 0) {
            if (await bcrypt.compare(user.password, result[0].password)) {
                const token = generateUUID();
                delete result[0].password;
                authManager.addToken(token, result[0]);
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

const logout = async (req, res, next) => {
    const token = req.credentials.token;
    autHelper.removeToken(token);
    res.json({ message: 'Successfully logged out!' });
};

const info = (req, res, next) => {
    try {
        res.json(req.credentials.user)
    } catch (error) {
        next(error);
    }
}


module.exports = {
    register,
    login,
    logout,
    info,
    setAuthHelper
}