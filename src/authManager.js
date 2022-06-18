const tokens = new Map();

function addToken(token, user) {
    tokens.forEach((value, key) => {
        if (JSON.stringify(value) == JSON.stringify(user)) {
            tokens.delete(key);
        }
    });
    tokens.set(token, user);
}

function removeToken(token) {
    tokens.delete(token);
}

function getUser(token) {
    return tokens.get(token);
}

function authentication() {
    return authenticationFull(() => true);
}

function authenticationFull(cb) {
    return (req, res, next) => {
        const token = req.headers['auth-token'];
        if (token) {
            if (getUser(token)) {
                const user = getUser(token);
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

class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    addToken,
    removeToken,
    getUser,
    authentication,
    authenticationFull,
    AuthenticationError,
};