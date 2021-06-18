export interface Config {
    environments: {
        production: HostConfig,
        development: HostConfig
    },
    database: {
        host: string,
        database: string,
        user: string,
        password: string
    }
    production: boolean;
    socketio: boolean;
}

export interface HostConfig {
    httpPort: number;
    httpsPort: number;
    database?: DatabaseConfig,
}

export interface DatabaseConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}