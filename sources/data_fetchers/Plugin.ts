import { CoinData }                                                from '../types/CoinData';
import { DatasetConfig }                                           from '../types/DatasetConfig';
import { IndexedBatchTimes, MissingBatches, MissingBatchesReport } from '../types/BatchTimes';
import { onPayload }                                               from '../types/FetchersCallbacks';
import { Signale }                                                 from 'signale';
import { Teleporter }                                              from './Teleporter';

export abstract class Plugin<Payload = any> {

    public readonly name: string;
    protected readonly config: DatasetConfig[];
    protected coin_data: CoinData = {};
    protected on_payload: onPayload<Payload>;
    protected log: Signale;
    private insert_count: number = 0;
    private sleep_time: number;
    private last_known_location: string;
    private fail_count: number = 0;
    private save_count: number = 0;

    protected constructor(name: string, config: DatasetConfig[]) {
        this.name = name;
        this.config = config;
        const signale_config = {
            scope: this.name,
            types: {
                success: {
                    badge: '',
                    color: 'green',
                    label: '[++]'
                },
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
        this.log = new Signale(signale_config);
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

        this.save_count = report.count;
        this.log.info(`[${new Date(Date.now())}]\t\t[Given ${this.save_count}]`);
        if (this.sleep_time && Date.now() < this.sleep_time) {
            if (Teleporter.Instance.enabled && this.last_known_location && this.last_known_location !== Teleporter.Instance.Location) {
                this.log.info(`[${new Date(Date.now())}]\t\t[Cooldown OFF] [Successful teleportation]`);
                this.sleep_time = undefined;
            } else {
                this.log.info(`[${new Date(Date.now())}]\t\t[Cooldown ${Math.floor((this.sleep_time - Date.now()) / 1000)}s]`);
                return;
            }
        }

        if (this.sleep_time) {
            this.log.info(`${this.name} cooldown off`);
            this.sleep_time = undefined;
        }

        this.fail_count = 0;
        await this.order(report.batches);

        if (this.getFailCount()) {
            this.log.warn(`[${new Date(Date.now())}]\t\t[Given ${this.save_count}] [Errors ${this.getFailCount()}]`);
        } else {
            this.log.info(`[${new Date(Date.now())}]\t\t[Given ${this.save_count}] [Errors ${this.getFailCount()}]`);
        }
        return;
    }

    public printInsertions(): void {
        this.log.success(`[${new Date(Date.now())}]\t\t[Given ${this.save_count}] [Errors ${this.getFailCount()}] [Inserted ${this.getInsertCount()}]`);
    }

    public abstract start(): void;

    public abstract stop(): void;

    public abstract async order(batches: MissingBatches): Promise<void>;

    protected cooldown(time: number): void {
        this.log.warn(`[${new Date(Date.now())}]\t\t[Cooldown START] [${time * 60}s]`);
        this.sleep_time = Date.now() + (time * 60 * 1000);
    }

    protected teleport(): void {
        if (Teleporter.Instance.enabled) {
            this.log.warn(`[${new Date(Date.now())}]\t\t[Teleport]`);
            this.last_known_location = Teleporter.Instance.Location;
            Teleporter.Instance.teleport();
        }
    }

    protected addFail(e: Error): void {
        ++this.fail_count;
        this.log.fatal(`[${new Date(Date.now())}]\t\t[Error nb ${this.fail_count}] [${e.message}]`);
    }

    protected getFailCount(): number {
        return this.fail_count;
    }
}
