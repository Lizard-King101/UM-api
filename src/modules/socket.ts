import { Server } from "node:http";
import { connected } from "node:process";
import { Server as SocketServer } from "socket.io";
import { DataBase } from "./database";
import { Image } from "./image";
import { YouTube, Progress, Complete } from "./youtube";

export class Socket {
    io: SocketServer;
    image: Image;
    youtube: YouTube;
    db: DataBase;

    roomId: string;

    sockets: Sockets = {};

    volumeLock: boolean = false;
    volume: number = 30;

    constructor(private server: Server) {
        this.io = new SocketServer(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.image = new Image();
        this.youtube = new YouTube();
        this.db = new DataBase();

        this.roomId = this.newID;
        console.log(this.roomId);
        this.initListeners(); 
    }

    initListeners() {
        this.io.on('connection', (socket) => {
            socket.on('get-room', () => {
                socket.emit('room-id', this.roomId)
            })

            socket.on('auth', (auth: {admin?: boolean, client?: boolean, room?: string}) => {
                console.log('AUTH: ', auth);
                
                if(auth.admin) this.sockets[socket.id] = {
                    client: false,
                    connected: true
                }
                else if(auth.client) this.sockets[socket.id] = {
                    client: true,
                    connected: false
                }
                
                console.log(`${this.sockets[socket.id].client ? 'Client' : 'Admin'} Connected`);
                

                if(this.sockets[socket.id].client && auth.room && auth.room == this.roomId) {
                    let connection: Connection = {
                        client_auth: true,
                    }
                    socket.emit('connected', connection)
                } else {
                    if(!this.sockets[socket.id].client) {
                        socket.emit('room-id', this.roomId)
                    } else {
                        socket.emit('connected', {
                            client_auth: false
                        } as Connection)
                    }
                }
            });

            socket.on('get-volume', () => {
                socket.emit('set-volume', {
                    volume: this.volume,
                    locked: this.volumeLock
                });
            })

            socket.on('test-lock', () => {
                this.volumeLock = !this.volumeLock;
                this.io.emit('set-volume', {
                    volume: this.volume,
                    locked: this.volumeLock
                });
            });

            socket.on('set-lock', (lock: boolean) => {
                console.log('SET LOCK', lock);
                
                this.volumeLock = lock;
                this.io.emit('set-volume', {
                    volume: this.volume,
                    locked: this.volumeLock
                });
            });

            socket.on('test-disconnect', () => {

            });

            socket.on('request-song', (video_id: string) => {
                let handleProgress = (data: Progress) => {
                    console.log('PROGRESS', data);
                    socket.emit('song-progress', {
                        id: video_id,
                        percent: data.progress.percentage
                    });
                }
                let handleFinished = async (data: Complete) => {
                    this.youtube.removeListener('progress', handleProgress);
                    this.youtube.removeListener('finish', handleFinished);
                    console.log('COMPLETE', data);
                    await this.image.download(data.thumbnail, `${data.videoId}.jpg`).catch((err) => {
                        console.log('Thumbnail download Failed');
                    });
                    let insert = {
                        video_id: data.videoId,
                        title: data.videoTitle,
                        artist: data.artist,
                        tags: '',
                        client: 1,
                        added: new Date()
                    }
                    let result = await this.db.insert('music', insert);
                    console.log(result);
                    socket.emit('song-complete', video_id);
                }

                this.youtube.on('progress', handleProgress);
                this.youtube.on('finish', handleFinished);
                socket.emit('song-progress', {adding: true});
                this.youtube.downlaod(video_id);
            })

            socket.on('volume', (volume: number) => {
                if(this.isAuth(socket.id) || !this.volumeLock) {
                    this.volume = volume;
                    console.log(volume); 
                    
                    this.io.emit('set-volume', {
                        volume: this.volume,
                        locked: this.volumeLock,
                        emitter: socket.id
                    });
                }
            });

            socket.on('submit-room', (room: string) => {
                console.log(room);
                if(room == this.roomId) {
                    socket.emit('connected', {
                        client_auth: true,
                        room: this.roomId
                    } as Connection)
                } else {
                    socket.emit('connected', {
                        client_auth: false,
                        message: 'Ride ID doesn\'t match'
                    } as Connection)
                }
            })

            socket.on('disconnect', () => {
                console.log(`${this.sockets[socket.id].client ? 'Client' : 'Admin'} Disconnected`);
                
                delete this.sockets[socket.id];
            });

            socket.emit('request-auth');
        })
    }

    isAuth(id: string) {
        return !this.sockets[id].client;
    }

    get newID() {
        return (Math.random() * 100000).toString(16).substr(-4); 
    }
}

interface Sockets {
    [key:string]: {
        client: boolean;
        connected: boolean;
    }
}

interface Connection {
    client_auth: boolean;
    message?: string;
    room?: string;
}