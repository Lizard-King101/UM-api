import fs from "fs";
import axios from "axios";
import path from "path";

export class Image {
    
    download(url: string, filename: string) {
        return new Promise(async (res, rej) => {
            console.log('Downloading Thumbnail image: ', url);
            
            let writeStream = fs.createWriteStream(path.join(global.paths.root, 'public/thumbnails', filename));
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });
            response.data.pipe(writeStream);
            writeStream.on('finish', () => {
                console.log('Finished Image');
                res(true)
            });
            writeStream.on('error', rej);
        })
    };

    
}