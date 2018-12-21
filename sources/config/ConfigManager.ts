import * as FS     from 'fs';
import { Signale } from 'signale';

export class ConfigManager {

    private static instance: ConfigManager;
    public _: any;
    public origin: string;
    private readonly log: Signale;

    private constructor() {
        const signale_config = {
            scope: 'config',
            types: {
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

    static get Instance(): ConfigManager {
        return (ConfigManager.instance || (ConfigManager.instance = new ConfigManager()));
    }

    public load(config_path: string): void {
        try {
            this._ = JSON.parse(FS.readFileSync(config_path).toString());
            this.origin = config_path;
        } catch (e) {
            this.log.fatal(e);
            throw new Error(`Unable to load config from ${config_path}`);
        }
    }

    public validate(): void {
        if (!this._.limits) {
            this._.limits = {};
        }

        if (!this._.coins) {
            throw new Error(`Invalid Scraper configuration in ${this.origin}: missing coins`);
        }
    }

}
