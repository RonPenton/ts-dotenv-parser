import { Env, parseDotEnv } from '../src';

describe('dotenv:', () => {

    beforeEach(() => {
        for (const key of Object.keys(process.env)) {
            delete process.env[key];
        }
    })

    test('parses', () => {

        process.env['A'] = 'a string';
        process.env['B'] = 'a string';

        const env = parseDotEnv({
            A: {},
            B: {}
        });

        expect(env.A).toBe('a string');
        expect(env.B).toBe('a string');
    });

    test('catches required vars', () => {

        process.env['A'] = 'a string';
        process.env['B'] = 'a string';

        const test = () => {
            parseDotEnv({
                A: {},
                B: {},
                C: {}
            });
        }

        expect(test).toThrow();
    });

    test('parses numbers', () => {
        process.env['A'] = '3.14159';
        const env = parseDotEnv({
            A: Env.number()
        });

        expect(env.A).toBe(3.14159);
    });

    test('throws on NaN', () => {
        process.env['A'] = 'abcd';
        const test = () => {
            parseDotEnv({
                A: Env.number()
            })
        };

        expect(test).toThrow();
    });

    test('throws on number above and below min', () => {
        process.env['A'] = '10';
        const min = () => {
            parseDotEnv({ A: Env.number({ min: 20 }) })
        };
        const max = () => {
            parseDotEnv({ A: Env.number({ max: 0 }) })
        };

        expect(min).toThrow();
        expect(max).toThrow();
    });

    test('numbers have default.', () => {
        const env = parseDotEnv({ A: Env.number({ default: 42 }) })

        expect(env.A).toBe(42);
    });

    test('parses booleans', () => {
        process.env['A'] = 'true';
        process.env['B'] = '1';
        process.env['C'] = 'FALSE';
        process.env['D'] = '0';
        const env = parseDotEnv({
            A: Env.boolean(),
            B: Env.boolean(),
            C: Env.boolean(),
            D: Env.boolean(),
            E: Env.boolean({ default: true })
        });

        expect(env.A).toBe(true);
        expect(env.B).toBe(true);
        expect(env.C).toBe(false);
        expect(env.D).toBe(false);
        expect(env.E).toBe(true);
    });

    test('throws on not a boolean', () => {
        process.env['A'] = 'abcd';
        const test = () => {
            parseDotEnv({
                A: Env.boolean()
            })
        };

        expect(test).toThrow();
    });

    test('enumerations', () => {
        process.env['A'] = 'DEBUG';
        process.env['B'] = 'trace';

        const env = parseDotEnv({
            A: Env.enum(['DEBUG', 'TRACE', 'INFO', 'WARNING', 'ERROR', 'FATAL']),
            B: Env.enum(['DEBUG', 'TRACE', 'INFO', 'WARNING', 'ERROR', 'FATAL'])

        });

        expect(env.A).toBe('DEBUG');
        expect(env.B).toBe('TRACE');
    });

    test('enumerations throw', () => {
        process.env['A'] = 'not debug';

        const test = () => {
            parseDotEnv({
                A: Env.enum(['DEBUG', 'TRACE', 'INFO', 'WARNING', 'ERROR', 'FATAL']),
            })
        };

        expect(test).toThrow();
    });

    test('enumerations default', () => {
        const env =
            parseDotEnv({
                A: Env.enum(['DEBUG', 'TRACE', 'INFO', 'WARNING', 'ERROR', 'FATAL'], { default: 'INFO' }),
            });

        expect(env.A).toBe('INFO');
    });

    test('string array', () => {
        process.env['A'] = '["foo", "bar", "baz"]';

        const env = parseDotEnv({
            A: Env.stringArray()
        });

        expect(env.A).toStrictEqual(['foo', 'bar', 'baz']);
    });

    test('fail string array, not all strings', () => {
        process.env['A'] = '["foo", "bar", 42]';

        const test = () => parseDotEnv({ A: Env.stringArray() });

        expect(test).toThrow()
    });

    test('fail string array, not even array', () => {
        process.env['A'] = '1066';

        const test = () => parseDotEnv({ A: Env.stringArray() });

        expect(test).toThrow()
    });

    test('json', () => {
        process.env['A'] = '{ "foo": 42, "bar": "string", "baz": true }';
        type MyObj = {
            foo: number;
            bar: string;
            baz: boolean;
        }
        const isMyObj = (obj: any): obj is MyObj => {
            if (
                'foo' in obj && typeof obj.foo === 'number'
                && 'bar' in obj && typeof obj.bar === 'string'
                && 'baz' in obj && typeof obj.baz === 'boolean'
            ) {
                return true;
            }
            return false;
        }

        const env = parseDotEnv({ A: Env.json(isMyObj) });

        expect(env.A.foo).toBe(42);
        expect(env.A.bar).toBe('string');
        expect(env.A.baz).toBe(true);


        process.env['A'] = '{ "foo": 42, "bar": "string", "baz": "true" }';
        const test = () => parseDotEnv({ A: Env.json(isMyObj) });
        expect(test).toThrow();
    });

    test('required', () => {
        const test = () => parseDotEnv({ A: Env.string() });

        expect(test).toThrow();
    });

    test('string', () => {
        process.env['A'] = 'foobar';
        const env = parseDotEnv({ A: Env.string() });

        expect(env.A).toBe('foobar');
    });


    test('nullable', () => {
        process.env['A'] = 'foobar';
        process.env['C'] = '42';

        const env = parseDotEnv({
            A: Env.nullable(Env.string()),
            B: Env.nullable(Env.string()),
            C: Env.nullable(Env.number()),
            D: Env.nullable(Env.number()),
        });

        expect(env.A).toBe('foobar');
        expect(env.B).toBe(null);
        expect(env.C).toBe(42);
        expect(env.D).toBe(null);
    });

});
