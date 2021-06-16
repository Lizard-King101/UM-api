import { Express, Request, Response } from 'express';
import { DataBase } from './database';

import fs from 'fs';
import path from 'path';

export class GET {
    db: DataBase;
    constructor(private app: Express) {
        this.db = new DataBase();
        this.app.get("*", (req, res) => {
            this.proccess(req, res);
        })
    }

    async proccess(req: Request, res: Response) {
        // split the request domain
        if(req && res) {
            // var domain = req.get('host').split(':')[0];
    
            // split url into array eg: domain.com/account/settings -> ["account", "settings"] 
            var urlArr = req.originalUrl.split('?')[0].replace(/^\/+|\/+$/g, '').split('/');
            // parse get peramiters
            var GET: any = false;
            if(req.originalUrl.split('?').length > 1){
                GET = {};
                req.originalUrl.split('?')[1].split('&').forEach((keyVal)=>{
                    let splitKey: any = keyVal.split('=');
                    GET[splitKey[0]] = !isNaN(splitKey[1]) ? Number(splitKey[1]) : decodeURI(splitKey[1]);
                });
            }
    
            // http or https
            var protocol = req.protocol;
            // load clinet details
    
            // res.send('ok');

            console.log({
                urlArr,
                GET,
                protocol
            })

            if(urlArr.length && (['music', 'thumbnails']).includes(urlArr[0])) {
                let ext = ({music: '.mp3', thumbnails: '.jpg'})[urlArr[0]];
                let file = <string>urlArr.pop();
                if(file.split('.').length == 1) file += ext; 
                let filePath = path.join(global.paths.root, 'public', ...urlArr, file);
                if(fs.existsSync(filePath)) {
                    let readStream = fs.createReadStream(filePath);
                    readStream.pipe(res);
                } else {
                    res.status(404).send('file not found');
                }
            }
        }
    }
}