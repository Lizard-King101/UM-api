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
                new Promise((res, rej) => {
                    let where: string[] = [];
                    if(POST.filters !== undefined) {
                        let filters: Filters = POST.filters;
                        for(let key of Object.keys(filters)) {
                            let value = filters[key];
                            let whereStr = where.length ? 'AND ' : '';
                            switch(key) {
                                case 'client':
                                    whereStr += `client = ${value ? '1' : '0'}`;
                                    break;
                                default:
                                    whereStr += `tags ${value ? 'LIKE' : 'NOT LIKE'} '%${key}%'`;
                                    break;
                            }
                            where.push(whereStr);
                        }
                    }
                    this.db.select({
                        table: 'music',
                        where
                    }).then((data) => {
                        res(data.map((r) => {
                            r.tagArr = r.tags === '' ? [] : r.tags.split(',');
                            return r;
                        }));
                    }).catch((err) => {
                        rej(err);
                    });
                }).then((result) => {
                    res.send(result);
                }).catch((error) => {
                    res.send({
                        error,
                        message: 'Error retreiving playlist'
                    })
                })
                break;
            case 'set-tags':
                new Promise((res, rej) => {
                    if(POST.video_id && POST.tags) {
                        let id: string = POST.video_id;
                        let tags: string = typeof POST.tags == 'string' ? POST.tags : Array.isArray(POST.tags) ? POST.tags.join(',') : rej({message: 'Incorrect tags format'});
                        this.db.update({
                            table: 'music',
                            where: `video_id = '${id}'`,
                            data: {
                                tags
                            }
                        }).then((result) => {
                            res(result);
                        }).catch((err) => {
                            rej(err);
                        })
                    } else {
                        rej('missing id or tags in request');
                    }
                }).then((result) => {
                    res.send(result);
                }).catch((error) => {
                    res.send({
                        error,
                        message: 'Error settings tags' 
                    });
                });
                break;
            case 'update-played':
                if(POST.video_id) {
                    this.db.update({
                        table: 'music',
                        data: {
                            last_played: new Date().toISOString()
                        },
                        where: `video_id = '${POST.video_id}'`
                    }).then((result) => {
                        res.send(result);
                    }).catch((err) => {
                        res.send(err);
                    })
                }
            default: 
                res.send({ok: true});
                break;
        }
        
    }
}

interface Filters {
    [key:string]: boolean;
}