import { Application, NextFunction, Request, Response } from 'express';
interface OptionsObject {
    register: boolean;
    restrictedRegister: ((validation: object) => boolean) | null;
    allowMultipleSessions: boolean;
    authTokenStoreDatabase: boolean;
}
declare class AuthenticationHelper<U extends {
    UUID: string;
}> {
    app: Application;
    apiAuthPath: string;
    database: any;
    options: OptionsObject;
    additionalAccountColumns: object;
    additionalAccountRegisterSchema: object;
    tokens: Map<string, U>;
    onLogin?: (token: string, dbentry: U) => void;
    onRegister?: (userobj: U) => void;
    constructor(app: Application, apiAuthPath: string, database: any, accountFile?: boolean, additionalAccountColumns?: {}, additionalAccountRegisterSchema?: {});
    install(onLogin?: (token: string, userobj: U) => void, onRegister?: (userobj: U) => void): void;
    setupDatabase(): void;
    addToken(token: string, user: U): Promise<void>;
    removeToken(token: string): Promise<void>;
    getUser(token: string): Promise<U>;
    authentication(): (req: AuthenticatedRequest<U>, res: Response<any, Record<string, any>>, next: NextFunction) => Promise<void>;
    authenticationFull(cb: (user: U) => boolean): (req: AuthenticatedRequest<U>, res: Response, next: NextFunction) => Promise<void>;
}
export interface AuthenticatedRequest<U> extends Request {
    credentials?: {
        token: string;
        user: U;
    };
}
declare class AuthenticationError extends Error {
    constructor(message: string);
}
export { AuthenticationHelper, AuthenticationError };
