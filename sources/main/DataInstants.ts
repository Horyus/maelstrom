import { BatchTimes, MissingBatches, MissingBatchesReport } from '../types/BatchTimes';
import { getRoundedTime }                                   from '../helpers/getRoundedTime';
import { getBatchTimeRangeExclusive }                       from '../helpers/getBatchTimeRangeExclusive';
import { getBatchTimeRange }                                from '../helpers/getBatchTimeRange';
import { getBatchTime }                                     from '../helpers/getBatchTime';

interface DataInstantsBatches {
    [key: number]: boolean;
}

interface DataInstantsCoins {
    [key: string]: DataInstantsBatches;
}

interface DataInstantsPlugins {
    [key: string]: DataInstantsCoins;
}

export class DataInstants {

    private current: number;
    private readonly coins: string[] = [];
    private readonly plugins: DataInstantsPlugins = {};

    constructor() {
        this.current = getRoundedTime();
    }

    public clear(plugin: string, coin: string, time: number): void {
        delete this.plugins[plugin][coin][time];
    }

    public addPlugin(name: string): void {
        this.setCurrent();
        this.plugins[name] = {};
        for (const coin of this.coins) {
            this.plugins[name][coin] = {};
        }
    }

    public addCoin(name: string): void {
        this.setCurrent();
        this.coins.push(name);
        for (const plugin of Object.keys(this.plugins)) {
            this.plugins[plugin][name] = {};
        }
    }

    public setHoles(plugin: string, coin: string, holes: number[]): void {
        this.setCurrent();
        for (const hole of holes) {
            const batch: BatchTimes = getBatchTime(hole);
            this.plugins[plugin][coin][batch.end] = true;
        }
    }

    public setStart(plugin: string, coin: string, start: number): void {
        this.setCurrent();
        const range: BatchTimes[] = getBatchTimeRange(start, this.current);
        for (const batch of range) {
            this.plugins[plugin][coin][batch.end] = true;
        }
    }

    public getMissingBatches(plugin: string, limit?: number): MissingBatchesReport {
        this.setCurrent();
        const ret: MissingBatchesReport = {batches: {}, count: 0};
        for (const coin of this.coins) {
            ret.batches[coin] = [];
            const left_batches: number[] = Object.keys(this.plugins[plugin][coin]).map((batch: string): number =>
                parseInt(batch)).sort();
            let count = 0;
            for (const time of left_batches) {
                if (this.plugins[plugin][coin][time] === true) {
                    ret.batches[coin].push(getBatchTime(time));
                    ++count;
                    if (limit !== undefined && count >= (limit / this.coins.length)) break;

                }
            }
            ret.count += count;
        }
        return ret;
    }

    private setCurrent(): void {
        const new_current: number = getRoundedTime();
        if (new_current !== this.current) {
            const newBatches: BatchTimes[] = getBatchTimeRangeExclusive(this.current, new_current);
            for (const plugin of Object.keys(this.plugins)) {
                for (const coin of this.coins) {
                    for (const batch of newBatches) {
                        this.plugins[plugin][coin][batch.end] = true;
                    }
                }
            }
        }
        this.current = new_current;
    }

}
