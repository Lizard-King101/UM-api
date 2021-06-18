export interface Config {
    environments: {
        production: HostConfig,
        development: HostConfig
    }
    production: boolean;
    socketio: boolean;
}

export interface HostConfig {
    httpPort: number;
    httpsPort: number;
    ffmpegPath: string;
    database: DatabaseConfig,
}

export interface DatabaseConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}