class AuthenticationHelper {
    constructor(app, apiAuthPath, database) {
        this.app = app;
        this.apiAuthPath = apiAuthPath;
        this.database = database;
        this.tokens = new Map();
    }
    install() {
        const { router, setAuthHelper } = require('./auth/index');
        setAuthHelper(this);
        this.app.use(this.apiAuthPath, router);
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