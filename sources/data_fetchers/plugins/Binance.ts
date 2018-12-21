import * as BinanceAPI                                   from 'node-binance-api';
import { BatchTimes, IndexedBatchTimes, MissingBatches } from '../../types/BatchTimes';
import { ConfigManager }                                 from '../../config/ConfigManager';
import { Plugin }                                        from '../Plugin';
import { sameDay }                                       from '../../helpers/sameDay';

enum BinanceRequestFields {
    OpenPrice = 1,
    HighPrice,
    LowPrice,
    ClosePrice,
    Volume,
    TradeCount = 8,
    TakerBuyVolume
}

export interface BinancePayload {
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
    trade_number: number;
    taker_buy: number;
}

export class Binance extends Plugin<BinancePayload> {

    private readonly binance_api: any;

    constructor() {
        super('binance', [

            {
                field_name: 'open_price',
                field_type: 'decimal'
            },
            {
                field_name: 'low_price',
                field_type: 'decimal',
            },
            {
                field_name: 'high_price',
                field_type: 'decimal',
            },
            {
                field_name: 'close_price',
                field_type: 'decimal',
            },
            {
                field_name: 'volume',
                field_type: 'decimal',
            },
            {
                field_name: 'trade_number',
                field_type: 'integer',
            },
            {
                field_name: 'taker_buy',
                field_type: 'decimal',
            }
        ]);
        try {
            this.binance_api = BinanceAPI().options({
                APIKEY: ConfigManager.Instance._.binance.public_key,
                APISECRET: ConfigManager.Instance._.binance.private_key,
                useServerTime: true,
                test: !!ConfigManager.Instance._.binance.test
            });
        } catch (e) {
            this.log.fatal(`[${Date.now()}]\t\t[Invalid Keys]`);
        }
    }

    public async order(batches: MissingBatches): Promise<void> {
        for (const coin of Object.keys(batches)) {

            if (!batches[coin].length) continue;

            const days: IndexedBatchTimes[][] = [];
            let day_idx: number = 0;

            batches[coin] = batches[coin].sort((batch_left: BatchTimes, batch_right: BatchTimes): number =>
                batch_left.end - batch_right.end);

            days.push([]);
            days[day_idx].push(batches[coin][0]);
            batches[coin] = batches[coin].slice(1);

            // Regroup batches that are on the same day
            for (const batch of batches[coin]) {
                if (sameDay(days[day_idx][days[day_idx].length - 1].end, batch.end)) {
                    days[day_idx].push(batch);
                } else {
                    ++day_idx;
                    days.push([]);
                    days[day_idx].push(batch);
                }
            }

            // Every day equals with 1 request
            for (const day of days) {
                try {

                    const data = await new Promise<any>((ok: any, ko: any): void => {
                        this.binance_api.candlesticks(`${coin}BTC`, '5m', (error: Error, ticks: any, symbol: any) => {
                            if (error) return ko(error);
                            return ok(ticks);
                        }, {startTime: day[0].end, endTime: day[day.length - 1].end + (5 * 60 * 1000)});
                    });

                    const found: number[] = [];
                    for (const tick of data) {
                        for (const batch of day) {

                            const time: number = tick[0];

                            if (time !== batch.end) continue;

                            found.push(batch.end);

                            const payload: BinancePayload = {} as BinancePayload;

                            payload.open_price = parseFloat(tick[BinanceRequestFields.OpenPrice]);
                            payload.low_price = parseFloat(tick[BinanceRequestFields.LowPrice]);
                            payload.high_price = parseFloat(tick[BinanceRequestFields.HighPrice]);
                            payload.close_price = parseFloat(tick[BinanceRequestFields.ClosePrice]);
                            payload.volume = parseFloat(tick[BinanceRequestFields.Volume]);
                            payload.trade_number = tick[BinanceRequestFields.TradeCount];
                            payload.taker_buy = parseFloat(tick[BinanceRequestFields.TakerBuyVolume]);

                            this.on_payload(coin, batch, payload);
                        }

                    }

                    for (const batch of day) {
                        if (found.findIndex((val: number) => val === batch.end) === -1) {
                            this.on_payload(coin, batch, {
                                open_price: -1,
                                low_price: -1,
                                high_price: -1,
                                close_price: -1,
                                volume: -1,
                                trade_number: -1,
                                taker_buy: -1
                            });
                        }
                    }

                } catch (e) {
                    this.addFail(e);
                    if (this.getFailCount() >= 10) {
                        this.cooldown(5);
                        return;
                    }
                }
            }
        }
    }

    public start(): void {
    }

    public stop(): void {
    }

}
