import { Express } from 'express';
import express from 'express';
import session from 'express-session';
import Cors from 'cors';
import framegaurd from 'frameguard';

import http from 'http';

/*
    Type Definitions
*/
import { Server } from 'node:http';
import { GET } from './get';
import { POST } from './post';
import { Socket } from './socket';

export class Main {
    httpServer: Server;
    get: GET;
    post: POST;

    constructor(
        private app: Express
    ) {
        
        this.app.set('trust proxy', 1);
        this.app.use(framegaurd());
        this.app.use(express.urlencoded({extended: false}));
        this.app.use(express.json());
        this.app.use(Cors());
        this.app.use(session({
            secret: 'some secret change later',
            resave: true,
            saveUninitialized: true,
            cookie: { 
                expires: new Date(new Date().getTime() + 300000),
                secure: false,
                sameSite: true
            }
        }));
        
        this.get = new GET(this.app);
        this.post = new POST(this.app);
        
        this.httpServer = http.createServer(this.app);
        
        let socket = new Socket(this.httpServer);



        this.serverListen();
    }

    async serverListen() {
        let httpPort = global.config.production ? global.config.environments.production.httpPort : global.config.environments.development.httpPort 
        this.httpServer?.listen(httpPort, () => {
            console.log('HTTP listening on port: '+httpPort);
        })
    }
}