import { Plugin }                     from '../Plugin';
import { BatchTimes, MissingBatches } from '../../types/BatchTimes';
import * as GTrendsAPI                from 'google-trends-api';
import * as Signale                   from 'signale';
import { sameHour }                   from '../../helpers/sameHour';

interface GTrendsPayload {
    search: number;
}

export class GTrends extends Plugin<GTrendsPayload> {

    constructor() {
        super('gtrends', [
            {
                field_name: 'search',
                field_type: 'bigint'
            }
        ]);
    }

    public start(): void {
    }

    public stop(): void {
    }

    public async order(batches: MissingBatches): Promise<void> {
        for (const coin of Object.keys(batches)) {
            if (!batches[coin].length) continue;

            const hours: BatchTimes[][] = [];
            let hour_idx: number = 0;

            // Sort the batches to have batches that are the same day together
            batches[coin] = batches[coin].sort((batch_left: BatchTimes, batch_right: BatchTimes): number =>
                batch_left.end - batch_right.end);

            // Create first day
            hours.push([]);
            hours[hour_idx].push(batches[coin][0]);
            batches[coin] = batches[coin].slice(1);

            // Regroup batches that are on the same hour and same day
            for (const batch of batches[coin]) {
                if (sameHour(hours[hour_idx][hours[hour_idx].length - 1].end, batch.end)) {
                    hours[hour_idx].push(batch);
                } else {
                    ++hour_idx;
                    hours.push([]);
                    hours[hour_idx].push(batch);
                }
            }

            // Every hour equals with 1 request
            for (const hour of hours) {
                let raw_data;
                try {
                    raw_data = await GTrendsAPI.interestOverTime({
                        keyword: this.coin_data[coin].gtrends.name,
                        startTime: new Date(hour[0].start),
                        endTime: new Date(hour[hour.length - 1].end),
                        granularTimeResolution: true
                    });

                    if (!raw_data) continue;

                    const data = JSON.parse(raw_data);

                    // Then we extract the specific data for every batch, and add up the values for the 5 minutes
                    for (const batch of hour) {

                        let val: number = 0;

                        for (let timeline_idx = 0; timeline_idx < data.default.timelineData.length; ++timeline_idx) {
                            if ((parseInt(data.default.timelineData[timeline_idx].time) * 1000) === batch.start && timeline_idx + 5 < data.default.timelineData.length) {
                                for (let batch_idx = timeline_idx; batch_idx < timeline_idx + 5; ++batch_idx) {
                                    val += data.default.timelineData[batch_idx].value[0];
                                }
                                break;
                            }
                        }
                        this.on_payload(coin, batch.end, {
                            search: val
                        });

                    }

                } catch (e) {
                    this.addFail();
                    if (e.requestBody) {
                        if (e.requestBody.indexOf('429') !== -1 || e.requestBody.indexOf('(Too Many Requests)') !== -1) {
                            Signale.warn(`gtrends limit reached`);
                            this.cooldown(5);
                            this.teleport();
                            return;
                        }
                        Signale.fatal(e.requestBody);
                    }
                    Signale.fatal(`gtrends: ${e.message}`);
                }
            }

        }
    }

}
