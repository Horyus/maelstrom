import * as FS                 from 'fs';
import * as UUID               from 'uuid/v1';
import * as HasBin             from 'hasbin';
import * as IsRoot             from 'is-root';
import { Signale }             from 'signale';
import { ChildProcess, spawn } from 'child_process';

export class Teleporter {
    private static instance: Teleporter;
    private portals: string[] = [];
    private auth: string;
    private isEnabled: boolean = false;
    private location: string = UUID();
    private teleporting: boolean = false;
    private openvpn: ChildProcess;
    private readonly log: Signale;

    private constructor() {
        const signale_config = {
            scope: 'teleptr',
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

    public static get Instance(): Teleporter {
        return (Teleporter.instance || (Teleporter.instance = new Teleporter()));
    }

    public get enabled(): boolean {
        return this.isEnabled;
    }

    public get Location(): string {
        return this.location;
    }

    public enable(): void {
        if (!HasBin.sync('openvpn')) {
            throw new Error('Teleporter cannot locate openvpn binary');
        }

        if (!IsRoot()) {
            throw new Error('Teleporter requires root permissions');
        }

        this.isEnabled = true;
    }

    public setAuth(auth: string): void {
        if (!FS.existsSync(auth)) {
            throw new Error(`path '${auth}' does not exist`);
        }

        this.auth = auth;
    }

    public addPortalDir(dir: string): void {
        if (!FS.existsSync(dir)) {
            throw new Error(`path '${dir}' does not exist`);
        }

        if (!FS.statSync(dir).isDirectory()) {
            throw new Error(`path '${dir}' is not a directory`);
        }

        const data: string[] = FS.readdirSync(dir).map((file: string) => dir + '/' + file);

        this.portals = [
            ...this.portals,
            ...data
        ];
    }

    public listPortals(): void {
        for (const portal of this.portals) {
            this.log.info(`[${new Date(Date.now())}]\t\t[LOADED] ${portal}`);
        }
    }

    public teleport(): void {
        if (this.teleporting) return;
        this.teleporting = true;

        if (this.openvpn) {
            this.openvpn.kill();
        }

        let args: string[];
        const random_portal = Math.floor(Math.random() * this.portals.length);
        if (process.platform === 'darwin') {
            args = [
                '--up', `${__dirname}/teleporter_resources/update-resolv-conf`,
                '--down', `${__dirname}/teleporter_resources/update-resolv-conf`,
                '--script-security', '2',
                '--config', this.portals[random_portal]
            ];
        } else {
            args = [
                '--up', '/etc/openvpn/update-resolv-conf',
                '--down', '/etc/openvpn/update-resolv-conf',
                '--script-security', '2',
                '--config', this.portals[random_portal]
            ];

        }
        if (this.auth) {
            args.push('--auth-user-pass');
            args.push(this.auth);
        }
        this.openvpn = spawn('openvpn', args);
        this.openvpn.stdout.on('data', (data: Buffer) => {
            if (data.toString().indexOf('Initialization Sequence Completed') !== -1) {
                this.location = UUID();
                this.log.info(`[${new Date(Date.now())}]\t\t[Teleportation Successful] [${this.portals[random_portal]}]`);
                this.teleporting = false;
            }
        });

        this.openvpn.stderr.on('data', (data: Buffer) => {
            //Signale.fatal(data.toString());
        });
        this.openvpn.on('close', (code: number) => {
            this.log.info(`[${new Date(Date.now())}]\t\t[Closed]`);
        });
    }

}
