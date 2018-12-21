import { CoinData }                                                from '../types/CoinData';
import { DatasetConfig }                                           from '../types/DatasetConfig';
import { IndexedBatchTimes, MissingBatches, MissingBatchesReport } from '../types/BatchTimes';
import { onPayload }                                               from '../types/FetchersCallbacks';
import * as Signale                                                from 'signale';
import { Teleporter }                                              from './Teleporter';

export abstract class Plugin<Payload = any> {

    public readonly name: string;
    protected readonly config: DatasetConfig[];
    protected coin_data: CoinData = {};
    protected on_payload: onPayload<Payload>;
    private insert_count: number = 0;
    private sleep_time: number;
    private last_known_location: string;
    private fail_count: number = 0;

    protected constructor(name: string, config: DatasetConfig[]) {
        this.name = name;
        this.config = config;
    }

    public getConfig(): DatasetConfig[] {
        return this.config;
    }

    public plug(coin_data: CoinData, on_payload: onPayload<Payload>): DatasetConfig[] {
        this.coin_data = coin_data;
        this.on_payload = (coin: string, batch: IndexedBatchTimes, payload: Payload): void => {
            ++this.insert_count;
            on_payload(coin, batch, payload);
        };
        return this.config;
    }

    public getInsertCount(): number {
        const ret: number = this.insert_count;
        this.insert_count = 0;
        return ret;
    }

    public async checkCooldownAndOrder(report: MissingBatchesReport): Promise<void> {

        if (this.sleep_time && Date.now() < this.sleep_time) {
            if (Teleporter.Instance.enabled && this.last_known_location && this.last_known_location !== Teleporter.Instance.Location) {
                Signale.info(`${this.name} cooldown off due to succesful teleportation`);
                this.sleep_time = undefined;
            } else {
                Signale.warn(`${this.name} cooldown [${Math.floor((this.sleep_time - Date.now()) / 1000)}s]`);
                return;
            }
        }

        if (this.sleep_time) {
            Signale.info(`${this.name} cooldown off`);
            this.sleep_time = undefined;
        }

        Signale.info(`${this.name} is given ${report.count} batches to process`);
        this.fail_count = 0;
        await this.order(report.batches);
        Signale.info(`${this.name} is done for this round`);
        return;
    }

    public abstract start(): void;

    public abstract stop(): void;

    public abstract async order(batches: MissingBatches): Promise<void>;

    protected cooldown(time: number): void {
        Signale.info(`${this.name} set itself into ${time * 60}s cooldown`);
        this.sleep_time = Date.now() + (time * 60 * 1000);
    }

    protected teleport(): void {
        if (Teleporter.Instance.enabled) {
            Signale.info(`${this.name} requested teleportation`);
            this.last_known_location = Teleporter.Instance.Location;
            Teleporter.Instance.teleport();
        }
    }

    protected addFail(): void {
        ++this.fail_count;
    }

    protected getFailCount(): number {
        return this.fail_count;
    }
}
