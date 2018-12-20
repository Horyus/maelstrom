import { Logger, QueryRunner } from 'typeorm';
import * as Signale            from 'signale';

export class CustomTypeORMLogger implements Logger {

    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        if (parameters) {
            for (let idx = 0; idx < parameters.length; ++idx) {
                query = query.replace(`$${idx + 1}`, parameters[idx]);
            }
        }
        Signale.info(query);
    }

    logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        if (parameters) {
            for (let idx = 0; idx < parameters.length; ++idx) {
                query = query.replace(`$${idx + 1}`, parameters[idx]);
            }
        }
        Signale.fatal(query);
    }

    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        if (parameters) {
            for (let idx = 0; idx < parameters.length; ++idx) {
                query = query.replace(`$${idx + 1}`, parameters[idx]);
            }
        }
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
                break;
            case 'warn':
                Signale.warn(message);
                break;
            default:
                Signale.info(message);
                break;
        }
    }

}
