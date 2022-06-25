const { AuthenticationError } = require("./AuthenticationHelper");

class ErrorHelper {
    constructor() {

    }
    install() {
        return (err, req, res, next) => {
            const error = {
                message: err.stack.split('\n')[0],
                stack: err.stack,
            };
            let status = 500;
            if (err instanceof AuthenticationError)
                status = 401;

            try {
                const { Database } = require('@jodu555/mysqlapi');
                const database = Database.getDatabase();
                if (err instanceof database.ParsingError)
                    status = 422;
            } catch (error) {

            }



            if (process.env.NODE_ENV !== 'production') {
                if (error.message.includes('notFound')) {
                    res.status(404).send({
                        success: false,
                        path: req.path,
                        message: 'Route not Found!',
                    });
                } else {
                    res.status(status).send({
                        success: false,
                        method: req.method,
                        path: req.path,
                        error,
                    });
                }
            } else {
                res.status(status).send({
                    success: false,
                    message: error.message,
                })
            }
        }
    }
}


module.exports = ErrorHelper;