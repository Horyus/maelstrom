import 'reflect-metadata';

import * as CommandPost         from 'commandpost';
import * as Signale             from 'signale';
import { ConfigManager }        from './config/ConfigManager';
import { DatabaseConnection }   from './database/DatabaseConnection';
import { Binance }              from './data_fetchers/plugins/Binance';
import { Scraper }              from './main/Scraper';
import { GTrends }              from './data_fetchers/plugins/GTrends';
import { DatasetTablesManager } from './database/DatasetTablesManager';
import { TablesDetails }        from './types/TablesDetails';
import { Teleporter }           from './data_fetchers/Teleporter';

const cli = CommandPost
    .create('maelstrom <action>')
    .version('1.0.4', '-v, --version')
    .description('Crypto Data Aggregator')
    .option('--config     <string>', 'Maelstrom configuration file path')
    .option('--dbport     <port>', 'Port of Postgres Database')
    .option('--dbhost     <ip>', 'Host of Postgres Database')
    .option('--dbusername <string>', 'Username of Postgres Database')
    .option('--dbpassword <string>', 'Password of Postgres Database')
    .option('--dbname     <string>', 'Database Name of Postgres Database')
    .action(async (opts: any, args: any): Promise<void> => {
        switch (args.action) {
            case 'start':

                ConfigManager.Instance.load(opts.config[0] || process.env['MAELSTROM_CONFIG'] || process.env.HOME + '/maelstrom.json');
                ConfigManager.Instance.validate();
                await DatabaseConnection.Instance.connect(
                    opts.dbhost[0] || process.env['MAELSTROM_DBHOST'] || 'localhost',
                    parseInt(opts.dbport[0]) || parseInt(process.env['MAELSTROM_DBPORT']) || 5432,
                    opts.dbusername[0] || process.env['MAELSTROM_DBUSERNAME'] || 'maelstrom',
                    opts.dbpassword[0] || process.env['MAELSTROM_DBPASSWORD'] || 'pass',
                    opts.dbname[0] || process.env['MAELSTROM_DBNAME'] || 'maelstrom'
                );
                if (ConfigManager.Instance._.teleporter) {
                    if (!ConfigManager.Instance._.teleporter.portals) {
                        throw new Error('Missing portals in Teleporter configuration');
                    }

                    Teleporter.Instance.enable();

                    if (ConfigManager.Instance._.teleporter.auth) {
                        Teleporter.Instance.setAuth(ConfigManager.Instance._.teleporter.auth);
                    }
                    for (const portal of ConfigManager.Instance._.teleporter.portals) {
                        Teleporter.Instance.addPortalDir(portal);
                    }
                }
                const scraper: Scraper = new Scraper([
                    new Binance(),
                    new GTrends()
                ]);
                await scraper.init();
                await scraper.start();

                break;
            case 'list':

                ConfigManager.Instance.load(opts.config[0] || process.env['MAELSTROM_CONFIG'] || process.env.HOME + '/maelstrom.json');
                ConfigManager.Instance.validate();
                await DatabaseConnection.Instance.connect(
                    opts.dbhost[0] || process.env['MAELSTROM_DBHOST'] || 'localhost',
                    parseInt(opts.dbport[0]) || parseInt(process.env['MAELSTROM_DBPORT']) || 5432,
                    opts.dbusername[0] || process.env['MAELSTROM_DBUSERNAME'] || 'maelstrom',
                    opts.dbpassword[0] || process.env['MAELSTROM_DBPASSWORD'] || 'pass',
                    opts.dbname[0] || process.env['MAELSTROM_DBNAME'] || 'maelstrom'
                );
                const infos: TablesDetails[] = await DatasetTablesManager.getTablesDetails();
                console.log('+-------------------------+-------------------------+');
                console.log('+ name                    + count                   +');
                console.log('+-------------------------+-------------------------+');
                for (const table of infos) {
                    console.log(`+ ${table.name}${' '.repeat(24 - table.name.length)}+ ${table.count}${' '.repeat(24 - table.count.toString().length)}+`);
                    console.log('+-------------------------+-------------------------+');
                }
                process.exit(0);

                break;
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
