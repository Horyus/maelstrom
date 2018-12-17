import * as CommandPost from 'commandpost';
import * as Signale from 'signale';
import { ConfigManager } from './config/ConfigManager';

const cli = CommandPost
    .create('maelstrom')
    .version('1.0.0', '-v, --version')
    .description('Crypto Data Aggregator')
    .option('-c, --config <path>', 'Maelstrom configuration file path')
    .option('-p, --port   <port>', 'Listening port for the REST API')
    .option('-h, --host   <ip>', 'Listening IP Address for the REST API')
    .action((opts: any): void => {
        ConfigManager.Instance.load(opts.config[0] || process.env['MAELSTROM_CONFIG'] || './maelstrom.json');
    });

CommandPost
    .exec(cli, process.argv)
    .catch((e: Error) => {
        Signale.fatal(e.message);
        process.exit(1);
    });
