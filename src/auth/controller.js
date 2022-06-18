const { Database } = require('@jodu555/mysqlapi');
const database = Database.getDatabase();
const authManager = require('../../utils/authManager');
const bcrypt = require('bcryptjs');

const generateUUID = () => {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

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
    authManager.removeToken(token);
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
    info
}