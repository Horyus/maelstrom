export function getRoundedTime(time?: number): number {
    const now = time || Date.now() - (10 * 60 * 1000);
    return now - (now % (5 * 60 * 1000));
}
