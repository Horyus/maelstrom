export async function Sleep(time: number): Promise<void> {
    return new Promise<void>((ok: any, _: any): void => {
        setTimeout((): void => {
            ok();
        }, time * 1000);
    });
}
