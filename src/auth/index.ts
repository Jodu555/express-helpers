import { Request, Response } from 'express';
import { AuthenticationHelper } from '../AuthenticationHelper';

const express = require('express');
const controller = require('./controller');
const router = express.Router();
let authHelper: AuthenticationHelper<any>;

const setAuthHelper = (h: AuthenticationHelper<any>) => {
	authHelper = h;
	controller.setAuthHelper(h);

	router.get('/', (req: Request, res: Response) => {
		res.json({ message: 'Auth-Router works just fine' });
	});

	authHelper.options.register && router.post('/register', controller.register);
	router.post('/login', controller.login);
	router.get('/logout', authHelper.authentication(), controller.logout);
	router.get('/info', authHelper.authentication(), controller.info);
};

export = {
	router,
	setAuthHelper,
};
