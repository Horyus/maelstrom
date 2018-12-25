import { Connection, createConnection } from 'typeorm';
import { CustomTypeORMLogger }          from './CustomTypeORMLogger';
import * as Fs from 'fs';

export class DatabaseConnection {

    private static instance: DatabaseConnection;
    public _: Connection;
    public host: string;
    public port: number;
    public username: string;
    public password: string;
    public database: string;

    private constructor() {
    }

    public static get Instance(): DatabaseConnection {
        return (DatabaseConnection.instance || (DatabaseConnection.instance = new DatabaseConnection()));
    }

    public async connect(host: string, port: number, username: string, password: string, database: string, ssl?: any): Promise<void> {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.database = database;

        let config: any =
        {
            type: 'postgres',
            host: this.host,
            port: this.port,
            username: this.username,
            password: this.password,
            database: this.database,
            logging: !!process.env.LOG,
            logger: process.env.LOG ? new CustomTypeORMLogger() : undefined
        };

        if (ssl) {
            config = {
                ...config,
                ssl: {
                    rejectUnauthorized : false,
                    ca: Fs.readFileSync(ssl.ca).toString(),
                    cert: Fs.readFileSync(ssl.cert).toString(),
                    key: Fs.readFileSync(ssl.key).toString()
                }
            };
        }

        this._ = await createConnection(config);

    }

}
