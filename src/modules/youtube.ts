
import YoutubeMp3Downloader  from "youtube-mp3-downloader";
import path from "path";
import EventEmitter from "events";
import fs from 'fs';

export class YouTube extends EventEmitter{
    private YD: YoutubeMp3Downloader;
    activeDownloads: number = 0;
    maxDownloads: number = 4;

    private musicDir: string;

    constructor() {
        super();
        this.musicDir = path.join(global.paths.root, "public/music")

        this.YD = new YoutubeMp3Downloader({
            ffmpegPath: path.join(global.paths.root, "ffmpeg/bin/ffmpeg.exe"),
            outputPath: this.musicDir,
            queueParallelism: this.maxDownloads,
            progressTimeout: 4000,
            allowWebm: false
        });
    }

    downlaod(id: string) {
        this.YD.download(id, id+'.mp3');
        this.YD.on('progress', (prog: Progress) => {
            this.emit('progress', prog);
        });

        this.YD.on('error', (err) => {
            console.log(err);
            this.emit('error', {id, error: err});
        });

        this.YD.on('finished', (err, data: Complete) => {
            this.emit('finish', data);
        });
    }
}

export interface Progress {
    videoId: string;
    progress: {
      percentage: number;
      transferred: number;
      length: number;
      remaining: number;
      eta: number;
      runtime: number;
      delta: number;
      speed: number;
    }
}

export interface Complete {
    videoId: string,
    stats: { 
        transferredBytes: 4070553, 
        runtime: 3, 
        averageSpeed: 904567.33 
    },
    file: string,
    youtubeUrl: string,
    videoTitle: string,
    artist: string,
    title: string,
    thumbnail: string
}