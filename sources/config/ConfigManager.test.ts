import { ConfigManager } from './ConfigManager';

describe('[ConfigManager]', () => {

    test('Loading valid configuration', () => {
        ConfigManager.Instance.load(`${__dirname}/test_resources/valid.json`);
        expect(ConfigManager.Instance._.test[1]).toEqual('b');
    });

    test('[Fail] Load invalid json file', () => {
        expect(
            () => {
                ConfigManager.Instance.load(`${__dirname}/test_resources/invalid.json`);
            }
        ).toThrow();
    });

    test('[Fail] Load invalid path file', () => {
        expect(
            () => {
                ConfigManager.Instance.load(`${__dirname}/test_resources/invalud.c`);
            }
        ).toThrow();
    });

});
