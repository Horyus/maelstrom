import { Logger, QueryRunner } from 'typeorm';
import * as Signale from 'signale';

export class CustomTypeORMLogger implements Logger {

    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any
    {
        Signale.info(query);
    }

    logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        Signale.fatal(query);
    }

    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        Signale.warn(`${time} ms: ${query}`);
    }

    logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
        Signale.info(message);
    }

    logMigration(message: string, queryRunner?: QueryRunner): any {
        Signale.info(message);
    }

    log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): any {
        switch (level) {
            case 'log':
            case 'info':
                Signale.info(message);
                break ;
            case 'warn':
                Signale.warn(message);
                break ;
            default:
                Signale.info(message);
                break ;
        }
    }

}
