import { BatchTimes }   from '../types/BatchTimes';
import { getBatchTime } from './getBatchTime';

export function getBatchTimeRange(begin: number, end: number): BatchTimes[] {
    const ret: BatchTimes[] = [];
    for (let idx = begin; idx <= end; idx += (5 * 60 * 1000)) {
        ret.push(getBatchTime(idx));
    }
    return ret;
}
