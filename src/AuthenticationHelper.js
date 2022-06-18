class AuthenticationHelper {
    constructor(app, apiAuthPath, database) {
        this.app = app;
        this.apiAuthPath = apiAuthPath;
        this.database = database;
    }
    install() {
        app.use(this.apiAuthPath,)
    }
}

module.exports = AuthenticationHelper;