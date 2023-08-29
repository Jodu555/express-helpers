import { NextFunction, Request, Response } from 'express';
declare class ErrorHelper {
    constructor();
    install(): (err: Error, req: Request, res: Response, next: NextFunction) => void;
}
export = ErrorHelper;
