import { ConfigManager } from './ConfigManager';

describe('[ConfigManager]', () => {

    test('Loading valid configuration', () => {
        expect(
            () => {
                ConfigManager.Instance.load(`${__dirname}/test_resources/valid.json`);
                ConfigManager.Instance.validate();
            }
        ).not.toThrow();
    });

    test('[Fail] Load invalid configuration: missing coins', () => {
        expect(
            () => {
                ConfigManager.Instance.load(`${__dirname}/test_resources/missing_coins.json`);
                ConfigManager.Instance.validate();
            }
        ).toThrow();
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
