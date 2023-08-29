import { NextFunction, Request, Response, Router } from 'express';
import { AuthenticatedRequest, AuthenticationHelper } from '../AuthenticationHelper';
export declare class AuthClassController<U extends {
    UUID: string;
}> {
    authHelper: AuthenticationHelper<U>;
    database: any;
    constructor(authHelper: AuthenticationHelper<U>);
    getRouter(): Router;
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    login(req: AuthenticatedRequest<U>, res: Response<any, Record<string, any>>, next: NextFunction): Promise<void>;
    logout(req: AuthenticatedRequest<U>, res: Response, next: NextFunction): Promise<void>;
    info(req: AuthenticatedRequest<U>, res: Response, next: NextFunction): void;
}
