"use strict";
const AuthenticationHelper_1 = require("./AuthenticationHelper");
class ErrorHelper {
    constructor() { }
    install() {
        return (err, req, res, next) => {
            var _a, _b;
            const error = {
                message: (_a = err.stack) === null || _a === void 0 ? void 0 : _a.split('\n')[0],
                stack: err.stack,
            };
            let status = 500;
            if (err instanceof AuthenticationHelper_1.AuthenticationError)
                status = 401;
            try {
                const { Database } = require('@jodu555/mysqlapi');
                const database = Database.getDatabase();
                if (err instanceof database.ParsingError)
                    status = 422;
            }
            catch (error) { }
            if (process.env.NODE_ENV !== 'production') {
                if ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('notFound')) {
                    res.status(404).send({
                        success: false,
                        path: req.path,
                        message: 'Route not Found!',
                    });
                }
                else {
                    res.status(status).send({
                        success: false,
                        method: req.method,
                        path: req.path,
                        error,
                    });
                }
            }
            else {
                res.status(status).send({
                    success: false,
                    message: error.message,
                });
            }
        };
    }
}
module.exports = ErrorHelper;
