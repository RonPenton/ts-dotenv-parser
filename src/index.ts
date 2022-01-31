import { env } from 'process';

type Parser<Out> = (val: string) => Out;

type Option<Out> = {
    parser?: Parser<Out>;
    default?: Out;
}

type WithoutParser<Out> = {
    default?: Out;
}

type WithParser<Out> = {
    parser: Parser<Out>;
    default?: Out;
}

type ValueType<O> =
    O extends { parser: Parser<infer R> } ? R :
    O extends { default: infer D } ? D
    : string;

type DotEnv<C extends DotEnvOptions> = {
    [Key in keyof C]: ValueType<C[Key]>
};

type DotEnvOptions = {
    [key: string]: Option<any>;
};

export function parseDotEnv<C extends DotEnvOptions>(configuration: C): DotEnv<C> {
    const variables = Object.keys(configuration) as (keyof C)[];
    const result = {} as DotEnv<C>;
    const errors = [];

    for (const variable of variables) {
        const value = env[variable as string];
        const config = configuration[variable];
        if (value !== undefined && value.trim() !== "") {
            try {
                result[variable] = config.parser ? config.parser(value) : value;
            } catch (e: any) {
                errors.push(`failed to parse environment variable {${variable}}: "${e.message}">`);
            }

        } else {
            if ('default' in config && config.default !== undefined) {
                result[variable] = config.default;
            } else {
                errors.push(`Environment variable {${variable}} is missing`);
            }
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }

    return result;
}

const nullable = <T>(inner: WithParser<T>) => {

    const parser = (val: string | null | undefined) => {
        if(val === null || val === undefined) {
            return null;
        }
        return inner.parser(val);
    }

    return {
        parser, 
        default: null
    };
}

const isString = (opts?: WithoutParser<string>): WithParser<string> => {
    return {
        parser: val => val,
        default: opts?.default
    };
}


const isNumber = (opts?: WithoutParser<number> & { min?: number, max?: number }): WithParser<number> => {

    return {
        parser: (val: string) => {
            const f = parseFloat(val);
            if (opts?.min !== undefined && f < opts.min) {
                throw new Error(`Value is less than minium value: ${opts.min}`);
            }
            if (opts?.max !== undefined && f > opts.max) {
                throw new Error(`Value is more than maximum value: ${opts.max}`);
            }
            if (isNaN(f)) {
                throw new Error(`Value is not a number: ${val}`);
            }
            return f;
        },
        default: opts?.default
    };
}

const isBoolean = (opts?: WithoutParser<boolean>): WithParser<boolean> => {
    return {
        parser: (val: string) => {
            if (val.toLowerCase() == 'true' || val == '1') {
                return true;
            }
            if (val.toLowerCase() == 'false' || val == '0') {
                return false;
            }
            throw new Error(`Value is not a boolean: ${val}`);
        },
        default: opts?.default
    };
}

const isEnum = <U extends string, T extends Readonly<[U, ...U[]]>>(vals: T, opts?: WithoutParser<T[number]>): WithParser<T[number]> => {

    return {
        parser: (val) => {
            const lower = val.toLowerCase();
            for (const original of vals) {
                if (original.toLowerCase() == lower) {
                    return original;
                }
            }

            throw new Error(`Value is does not belong to any of the following: ${vals}`);
        },
        default: opts?.default
    };
}

type Checker<T> = (obj: any) => obj is T;
const isJson = <T>(checker: Checker<T>, opts?: WithoutParser<T>): WithParser<T> => {
    return {
        parser: (val) => {
            const obj = JSON.parse(val);
            if (checker(obj)) {
                return obj;
            }
            throw new Error(`Value did not parse properly.`);
        },
        default: opts?.default
    };
}

const isArray = <T>(checker: Checker<T>, opts?: WithoutParser<T[]>): WithParser<T[]> => {
    return {
        parser: (val) => {
            const obj = JSON.parse(val);
            if (Array.isArray(obj) && obj.every(checker)) {
                return obj;
            }
            throw new Error(`Array did not parse properly.`);
        },
        default: opts?.default
    };
}

const isStr = (obj: any): obj is string => {
    return typeof obj === 'string';
}
const isStringArray = (opts?: WithoutParser<string[]>): WithParser<string[]> => {
    return isArray(isStr, opts);
}

export const Env = {
    number: isNumber,
    boolean: isBoolean,
    enum: isEnum,
    json: isJson,
    array: isArray,
    stringArray: isStringArray,
    string: isString,
    nullable
};
