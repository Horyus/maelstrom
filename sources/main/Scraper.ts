import { Plugin }                               from '../data_fetchers/Plugin';
import { ConfigManager }                        from '../config/ConfigManager';
import { Coin }                                 from '../types/Coin';
import { CoinData }                             from '../types/CoinData';
import { DatasetTablesManager }                 from '../database/DatasetTablesManager';
import Timeout = NodeJS.Timeout;
import { DataInstants }                         from './DataInstants';
import { MissingBatches, MissingBatchesReport } from '../types/BatchTimes';
import { DatasetConfig }                        from '../types/DatasetConfig';
import * as Signale                             from 'signale';
import { TablesDetails }                        from '../types/TablesDetails';
import { Teleporter }                           from '../data_fetchers/Teleporter';
import { RecoverPayload }                       from '../types/RecoverPayload';

export class Scraper {

    private readonly plugins: Plugin[];
    private readonly data_instants: DataInstants;

    private readonly coin_data: CoinData = {};
    private start_time: Date;
    private dataset_config: DatasetConfig[] = [];

    constructor(plugins: Plugin[]) {
        this.data_instants = new DataInstants();
        this.plugins = plugins;
    }

    public async init(): Promise<void> {
        Signale.info('[INIT]: Scraper');
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
        }

        for (const coin of coins) {
            for (const plugin of this.plugins) {
                const recovery: RecoverPayload = await DatasetTablesManager.Instance.init(plugin.name, plugin.getConfig(), coin.name);
                Signale.info(`[${plugin.name}] [${coin.name}] [${recovery.holes.length} holes] [${new Date(recovery.start)}]`);
                this.data_instants.setHoles(plugin.name, coin.name, recovery.holes);
                this.data_instants.setStart(plugin.name, coin.name, recovery.start);
            }
        }

        if (Teleporter.Instance.enabled) {
            Signale.info(`Teleporter enabled: ${Teleporter.Instance.getPortals().length} portals available`);
        }

    }

    public async start(): Promise<void> {
        Signale.info('[START]: Scraper');
        for (const plugin of this.plugins) {
            setTimeout(this.infinite_never_ending_loop_that_should_last_as_long_as_possible_pls.bind(this, plugin), 0);
        }
        setInterval(Scraper._global_infos.bind(this), 30 * 1000);
    }

    public shutdown(): number {
        return Date.now() - this.start_time.getTime();
    }

    private static async _global_infos(): Promise<void> {
        const tdata: TablesDetails[] = await DatasetTablesManager.getTablesDetails();
        for (const table of tdata) {
            Signale.info(`${table.name} ${table.count}`);
        }
    }

    private async infinite_never_ending_loop_that_should_last_as_long_as_possible_pls(plugin: Plugin): Promise<void> {
        const start = Date.now();
        try {
            const wait: Promise<void>[] = [];
            const missing: MissingBatchesReport = this.data_instants.getMissingBatches(plugin.name, ConfigManager.Instance._.limits[plugin.name]);
            const last_count: number = plugin.getInsertCount();

            if (last_count) {
                Signale.info(`${plugin.name} made ${last_count} inserts`);
            }

            if (missing.count !== 0) {
                await plugin.checkCooldownAndOrder(missing);
            }

        } catch (e) {
            Signale.fatal(e);
        }
        setTimeout(this.infinite_never_ending_loop_that_should_last_as_long_as_possible_pls.bind(this, plugin), Date.now() - start < 5000 ? 5000 : 0);
    }

    private async _forward_payload(plugin: string, coin: string, time: number, payload: any): Promise<void> {
        try {
            await DatasetTablesManager.set(plugin, coin, time, payload);
            this.data_instants.clear(plugin, coin, time);
        } catch (e) {
            Signale.fatal(e.message);
        }
    }

}
