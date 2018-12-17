import { Connection, createConnection } from 'typeorm';
import { Coin }                         from '../entities/Coin';
import { DatasetInfos }                   from '../entities/DatasetInfos';
import { CustomTypeORMLogger }          from './CustomTypeORMLogger';

export class DatabaseConnection {

    public _: Connection;

    public host: string;
    public port: number;
    public username: string;
    public password: string;
    public database: string;

    private static instance: DatabaseConnection;

    private constructor() {

    }

    public static get Instance(): DatabaseConnection {
        return (DatabaseConnection.instance || (DatabaseConnection.instance = new DatabaseConnection()));
    }

    public async connect(host: string, port: number, username: string, password: string, database: string): Promise<void> {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.database = database;

        this._ = await createConnection({
            type: 'postgres',
            host: this.host,
            port: this.port,
            username: this.username,
            password: this.password,
            database: this.database,
            entities: [
                Coin,
                DatasetInfos
            ],
            logging: true,
            logger: new CustomTypeORMLogger()
        });

    }

}
