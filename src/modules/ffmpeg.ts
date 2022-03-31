import EventEmitter from "events";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export class ffmpeg extends EventEmitter{
    file: string;
    ready: boolean = false;
    private exe: string;

    constructor(options: ffmpegOptions) {
        super();
        this.file = options.file;
        this.exe = options.executablePath;
        fs.readFile(this.file, (err, data) => {
            if(err) this.emit('error', {message: 'file not found'});
            else {
                this.ready = true;
                this.emit('ready');
            }
        })
    }

    

    convert(options: ConvertOptions) {

    }
}

export interface ffmpegOptions {
    file: string;
    executablePath: string;
}

export interface ConvertOptions {
    outputFormat: "mp3";
    destination: string;
    dropVideo?: boolean;
}