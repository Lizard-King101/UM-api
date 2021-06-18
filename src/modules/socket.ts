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

    status: Status = {
        playing: false
    }

    downloading: number = 0;

    clientSongs: Song[] = [];

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

            socket.on('set-lock', (lock: boolean) => {
                console.log('SET LOCK', lock);
                
                this.volumeLock = lock;
                this.io.emit('set-volume', {
                    volume: this.volume,
                    locked: this.volumeLock
                });
            });

            socket.on('new-ride', () => {
                this.volumeLock = false;
                this.roomId = this.newID;
                this.clientSongs = [];
                Object.keys(this.sockets).forEach((id) => {
                    if(this.sockets[id].client) {
                        this.io.to(id).emit('connected', {
                            client_auth: false,
                            message: 'Disconnected from music',
                            thanks: true
                        } as Connection)
                    } else {
                        this.io.emit('new-ride-start', this.roomId);
                    }
                })
            });

            socket.on('get-client-music', () => {
                socket.emit('client-music', this.clientSongs);
            })

            socket.on('request-song', async (video_id: string) => {
                socket.emit('song-progress', {id: video_id});
                let exists: Song[] = await <Promise<Array<Song>>>this.db.select({table: 'music', where: [`video_id = '${video_id}'`]}).catch((error) => {
                    console.log('DB error', error);
                })
                if(exists.length) {
                    socket.emit('song-complete', exists[0]);
                } else {
                    let handleProgress = (data: Progress) => {
                        if(data.videoId == video_id) {
                            console.log('PROGRESS', data);
                            socket.emit('song-progress', {
                                id: video_id,
                                percent: data.progress.percentage
                            });
                        }
                    }
                    let handleError = async (data: {id: string, error: string}) => {
                        if(data.id == video_id) {
                            this.youtube.removeListener('progress', handleProgress);
                            this.youtube.removeListener('finish', handleFinished);
                            this.youtube.removeListener('error', handleError);
                            socket.emit('song-error', {id: data.id, message: 'Song Failed to downlaod'});
                        }
                    }
                    let handleFinished = async (data: Complete) => {
                        if(data.videoId == video_id) {
                            this.youtube.removeListener('progress', handleProgress);
                            this.youtube.removeListener('finish', handleFinished);
                            this.youtube.removeListener('error', handleError);
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
                                added: new Date().toISOString()
                            }
                            let result = await this.db.insert('music', insert);
                            
                            this.clientSongs.push({
                                video_id: data.videoId,
                                title: data.videoTitle,
                                artist: data.artist,
                                tags: '',
                                client: true,
                                added: insert.added,
                                requested: true,
                            });
                            console.log('CLIENT SONGS', this.clientSongs);
                            
                            this.io.emit('requested-song', insert);
                            socket.emit('song-complete', video_id);
                        }
                    }
    
                    this.youtube.on('progress', handleProgress);
                    this.youtube.on('finish', handleFinished);
                    this.youtube.on('error', handleError);
                    this.youtube.downlaod(video_id);
                }
            })
            
            socket.on('download-song', async (video_id: string) => {
                socket.emit('song-progress', {id: video_id});
                let exists: Song[] = await <Promise<Array<Song>>>this.db.select({table: 'music', where: [`video_id = '${video_id}'`]}).catch((error) => {
                    console.log('DB error', error);
                })
                if(exists.length) {
                    socket.emit('song-downloaded', exists[0]);
                } else {
                    let handleProgress = (data: Progress) => {
                        if(data.videoId == video_id) {
                            socket.emit('song-progress', {
                                id: video_id,
                                percent: data.progress.percentage
                            });
                        }
                    }
                    let handleError = async (data: {id: string, error: string, details: any}) => {
                        if(data.id == video_id) {
                            this.youtube.removeListener('progress', handleProgress);
                            this.youtube.removeListener('finish', handleFinished);
                            this.youtube.removeListener('error', handleError);
                            socket.emit('song-error', {id: data.id, message: 'Song Failed to downlaod', error: data.error, details: data.details});
                        }
                    }
                    let handleFinished = async (data: Complete) => {
                        if(data.videoId == video_id) {
                            this.youtube.removeListener('progress', handleProgress);
                            this.youtube.removeListener('finish', handleFinished);
                            this.youtube.removeListener('error', handleError);
                            await this.image.download(data.thumbnail, `${data.videoId}.jpg`).catch((err) => {
                                console.log('Thumbnail download Failed');
                            });
                            let insert = {
                                video_id: data.videoId,
                                title: data.videoTitle,
                                artist: data.artist,
                                tags: '',
                                client: 0,
                                added: new Date().toISOString()
                            }
                            let result = await this.db.insert('music', insert);
                            
                            socket.emit('song-downloaded', insert);
                        }
                    }
    
                    this.youtube.on('progress', handleProgress);
                    this.youtube.on('finish', handleFinished);
                    this.youtube.on('error', handleError);
                    
                    this.youtube.downlaod(video_id);
                }
            })

            socket.on('request-next', () => {
                this.io.emit('play-next')
            })
            
            socket.on('request-play', (song: Song) => {
                this.io.emit('play-song', song);
            })

            socket.on('volume', (volume: number) => {
                if(this.isAuth(socket.id) || !this.volumeLock) {
                    this.volume = volume;
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

            

            socket.on('set-status', (status: Status) => {
                this.status = status;
                let stat: Status = {
                    playing: status.playing,
                    emitter: socket.id
                }
                if(status.song != undefined) stat.song = status.song;
                console.log('STATUS', status);
                
                this.io.emit('status', stat);
            })

            socket.on('get-status', () => {
                socket.emit('status', this.status);
            })

            socket.emit('request-auth');
        })
    }

    isAuth(id: string) {
        return this.sockets[id] ? !this.sockets[id].client : false;
    }

    get newID() {
        return (Math.random() * 100000).toString(16).substr(-4); 
    }
}

interface Status {
    song?: Song;
    playing: boolean;
    emitter?: string;
}

interface Song {
    id?: number;
    video_id: string;
    title: string;
    artist: string;
    tags: string;
    client: boolean;
    added?: any;
    last_played?: any;
    requested?: boolean;
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
    thanks?: boolean;
}