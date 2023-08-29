import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest, AuthenticationHelper } from '../AuthenticationHelper';
declare function setAuthHelper<U extends {
    UUID: string;
}>(h: AuthenticationHelper<U>): {
    register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    login: (req: AuthenticatedRequest<any>, res: Response<any, Record<string, any>>, next: NextFunction) => Promise<void>;
    logout: (req: AuthenticatedRequest<any>, res: Response, next: NextFunction) => Promise<void>;
    info: (req: AuthenticatedRequest<any>, res: Response, next: NextFunction) => void;
};
declare const _default: {
    setAuthHelper: typeof setAuthHelper;
};
export = _default;
