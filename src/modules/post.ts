import { Express, Request, Response } from "express";
import { DataBase } from "./database";

export class POST {
    db: DataBase;
    constructor(private app: Express) {
        this.app.post('*', (req, res) => {
            this.proccess(req, res);
        });
        this.db = new DataBase();
    }

    proccess(req: Request, res: Response) {
        // let domain = req.get('host').split(':')[0];
        let urlArr = req.originalUrl.replace(/^(\/)/, '').split('/');
        let protocol = req.protocol;
        // let cookies = parseCookies(req);
        let GET: any = false;
        if(req.originalUrl.split('?').length > 1){
            GET = {};
            req.originalUrl.split('?')[1].split('&').forEach((keyVal)=>{
                let splitKey: any = keyVal.split('=');
                GET[splitKey[0]] = !isNaN(splitKey[1]) ? Number(splitKey[1]) : decodeURI(splitKey[1]);
            });
        }
        let POST = req.body;
        let action = urlArr[0];
        let options = {
            protocol,
            urlArr,
            POST,
            GET,
            action
        }

        console.log(options);

        switch(action) {
            case 'get-playlist':
                this.db.select({
                    table: 'music'
                }).then((data) => {
                    console.log(data);
                    
                    res.send(data);
                })
                break;
            default: 
                res.send({ok: true});
                break;
        }
        
    }
}