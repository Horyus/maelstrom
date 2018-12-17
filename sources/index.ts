import * as CommandPost       from 'commandpost';
import * as Signale           from 'signale';
import 'reflect-metadata';
import { ConfigManager }      from './config/ConfigManager';
import { DatabaseConnection } from './database/DatabaseConnection';
import { Coin }               from './entities/Coin';

const cli = CommandPost
    .create('maelstrom <action>')
    .version('1.0.0', '-v, --version')
    .description('Crypto Data Aggregator')
    .option('--config     <string>', 'Maelstrom configuration file path')
    .option('--port       <port>', 'Listening port for the REST API')
    .option('--host       <ip>', 'Listening IP Address for the REST API')
    .option('--dbport     <port>', 'Port of Postgres Database')
    .option('--dbhost     <ip>', 'Host of Postgres Database')
    .option('--dbusername <string>', 'Username of Postgres Database')
    .option('--dbpassword <string>', 'Password of Postgres Database')
    .option('--dbname     <string>', 'Database Name of Postgres Database')
    .action(async (opts: any, args: any): Promise<void> => {
        switch (args.action) {
            case 'start':
                ConfigManager.Instance.load(opts.config[0] || process.env['MAELSTROM_CONFIG'] || './maelstrom.json');
                await DatabaseConnection.Instance.connect(
                    opts.dbhost[0] || process.env['MAELSTROM_DBHOST'] || 'localhost',
                    parseInt(opts.dbport[0]) || parseInt(process.env['MAELSTROM_DBPORT']) || 5432,
                    opts.dbusername[0] || process.env['MAELSTROM_DBUSERNAME'] || 'maelstrom',
                    opts.dbpassword[0] || process.env['MAELSTROM_DBPASSWORD'] || 'pass',
                    opts.dbname[0] || process.env['MAELSTROM_DBNAME'] || 'maelstrom'
                );
                break ;
            default:
                Signale.fatal(`Unknown action ${args.action}`);
                process.exit(1);
        }
    });

CommandPost
    .exec(cli, process.argv)
    .catch((e: Error) => {
        Signale.fatal(e.message);
        process.exit(1);
    });
