import { Plugin }                                  from '../data_fetchers/Plugin';
import { ConfigManager }                           from '../config/ConfigManager';
import { Coin }                                    from '../types/Coin';
import { CoinData }                                from '../types/CoinData';
import { DatasetTablesManager }                    from '../database/DatasetTablesManager';
import { DataInstants }                            from './DataInstants';
import { IndexedBatchTimes, MissingBatchesReport } from '../types/BatchTimes';
import { DatasetConfig }                           from '../types/DatasetConfig';
import { Signale }                                 from 'signale';
import { TablesDetails }                           from '../types/TablesDetails';
import { Teleporter }                              from '../data_fetchers/Teleporter';
import { RecoverPayload }                          from '../types/RecoverPayload';
import { CoinsRemoveList, TemporaryPayloadStore }  from '../types/TemporaryPayloadStore';
import { DatabaseConnection }                      from '../database/DatabaseConnection';
import { EntityManager }                           from 'typeorm';

export class Scraper {

    private static log: Signale;
    private readonly plugins: Plugin[];
    private readonly data_instants: DataInstants;
    private readonly coin_data: CoinData = {};
    private start_time: Date;
    private dataset_config: DatasetConfig[] = [];
    private readonly tmp_payload_store: TemporaryPayloadStore = {};

    constructor(plugins: Plugin[]) {
        this.data_instants = new DataInstants();
        this.plugins = plugins;
        const signale_config = {
            scope: 'scraper',
            types: {
                info: {
                    badge: '',
                    color: 'blue',
                    label: 'INFO'
                },
                fatal: {
                    badge: '',
                    color: 'red',
                    label: '[KO]'
                },
                warn: {
                    badge: '',
                    color: 'yellow',
                    label: '[!!]'
                }
            }
        };
        Scraper.log = new Signale(signale_config);

    }

    private static async _global_infos(): Promise<void> {
        const tdata: TablesDetails[] = await DatasetTablesManager.getTablesDetails();
        Scraper.log.info(`[${new Date(Date.now())}]`);
        for (const table of tdata) {
            Scraper.log.info(`[${new Date(Date.now())}]\t\t[${table.name}] [${table.count} full rows]`);
        }
        Scraper.log.info(`[${new Date(Date.now())}]`);
    }

    public async init(): Promise<void> {
        this.start_time = new Date(Date.now());
        const coins: Coin[] = ConfigManager.Instance._.coins;

        for (const coin of coins) {
            this.coin_data[coin.name] = coin.config;
            this.data_instants.addCoin(coin.name);
        }

        for (const plugin of this.plugins) {
            const configs: DatasetConfig[] = plugin.plug(this.coin_data, this._forward_payload.bind(this, plugin.name));
            for (const config of configs) {
                config.field_name = plugin.name + '_' + config.field_name;
            }
            this.dataset_config = [
                ...this.dataset_config,
                ...configs
            ];
        }

        for (const config of this.dataset_config) {
            DatasetTablesManager.Instance.addDatasetConfig(config);
        }

        for (const plugin of this.plugins) {
            this.data_instants.addPlugin(plugin.name);
            this.tmp_payload_store[plugin.name] = [];
        }

        for (const coin of coins) {
            for (const plugin of this.plugins) {
                const recovery: RecoverPayload = await DatasetTablesManager.Instance.init(plugin.name, plugin.getConfig(), coin.name);
                Scraper.log.info(`[${new Date(Date.now())}]\t\t[${plugin.name}] [${coin.name}] [${recovery.holes.length} holes] [${new Date(recovery.start)}]`);
                this.data_instants.setHoles(plugin.name, coin.name, recovery.holes);
                this.data_instants.setStart(plugin.name, coin.name, recovery.start);
            }
        }

        if (Teleporter.Instance.enabled) {
            Teleporter.Instance.listPortals();
        }

    }

    public async start(): Promise<void> {
        for (const plugin of this.plugins) {
            setTimeout(this.infinite_never_ending_loop_that_should_last_as_long_as_possible_pls.bind(this, plugin), 0);
        }
        setInterval(Scraper._global_infos.bind(this), 5 * 60 * 1000);
    }

    public shutdown(): number {
        return Date.now() - this.start_time.getTime();
    }

    private async infinite_never_ending_loop_that_should_last_as_long_as_possible_pls(plugin: Plugin): Promise<void> {
        const start = Date.now();
        try {
            this.data_instants.setCurrent(plugin.name);
            const missing: MissingBatchesReport = this.data_instants.getMissingBatches(plugin.name, ConfigManager.Instance._.limits[plugin.name]);

            if (missing.count !== 0) {
                await plugin.checkCooldownAndOrder(missing);
                await this._dispatch_tmp_payload_store(plugin.name);
                plugin.printInsertions();
                this.tmp_payload_store[plugin.name] = [];
            }

        } catch (e) {
            Scraper.log.fatal(e);
        }
        setTimeout(this.infinite_never_ending_loop_that_should_last_as_long_as_possible_pls.bind(this, plugin), Date.now() - start < 5000 ? 5000 : 0);
    }

    private async _dispatch_tmp_payload_store(plugin: string): Promise<void> {

        const erase_payload: CoinsRemoveList = {};
        for (const coin of Object.keys(this.coin_data)) {
            erase_payload[coin] = [];
        }
        await DatabaseConnection.Instance._.transaction(async (txmanager: EntityManager): Promise<void> => {
            for (const data of this.tmp_payload_store[plugin]) {
                try {
                    await DatasetTablesManager.set(txmanager, plugin, data.coin, data.batch.end, data.payload);
                    erase_payload[data.coin].push(data.batch);
                } catch (e) {
                    Scraper.log.fatal(e.message);
                }
            }
        });
        for (const coin of Object.keys(this.coin_data)) {
            this.data_instants.clear(plugin, coin, erase_payload[coin]);
        }

    }

    private async _forward_payload(plugin: string, coin: string, batch: IndexedBatchTimes, payload: any): Promise<void> {
        this.tmp_payload_store[plugin].push({
            coin,
            payload,
            batch
        });
    }

}
