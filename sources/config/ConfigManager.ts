import * as FS from 'fs';

export class ConfigManager {

    public _: any;
    private static instance: ConfigManager;

    private constructor() {}

    static get Instance(): ConfigManager {
        return (ConfigManager.instance || (ConfigManager.instance = new ConfigManager()));
    }

    public load(config_path: string): void {
        try {
            this._ = JSON.parse(FS.readFileSync(config_path).toString());
        } catch (e) {
            throw new Error(`Unable to load config from ${config_path}`);
        }
    }

}
