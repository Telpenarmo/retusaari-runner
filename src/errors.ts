import { RunError } from './errorDefs';

type ComplexRunErrorType = {
    [P in RunError as '']: P extends object
    ? { name: keyof P; type: P[keyof P] }
    : never;
}[''];

type ComplexRunErrorKinds = ComplexRunErrorType['name'];

type ComplexRunErrorMessageProducers = {
    [P in ComplexRunErrorType as P['name']]: (data: P['type']) => string;
};

interface ErrorDescription {
    title?: string;
    message: string;
}

const titles: Record<string, string | undefined> = {
    KotlincNotFound: 'Kotlinc not found',
    KotlincPermissionDenied:
        'Retussari runner was denied permission to run kotlinc',
    SaveError: 'Failed to save the script',
    RemoveError: 'Failed to remove the script',
    FailedSpawn: 'Failed to spawn kotlinc',
    WaitError: 'Uknown error',
};

const messages = {
    KotlincNotFound:
        'Check if kotlinc is installed on your machine and reachable with PATH variable.',
    KotlincPermissionDenied:
        'Strange. Make sure that file reachable as \'kotlinc\' is valid and executable.',
    UnsupportedPlatform: 'Unsupported platform',
    KillError: 'Kill failed',
};
const complexMessages: ComplexRunErrorMessageProducers = {
    SaveError: (msg: string) =>
        `Saving script to temporary file failed with following message: ${msg}`,
    RemoveError: (msg: string) =>
        `Removing temporary file failed with following message: ${msg}`,
    WaitError: (msg: string) =>
        `Running kotlinc failed with following message: ${msg}`,
    FailedSpawn: (msg: string) =>
        `An error occured while running the script: ${msg}`,
};

type ComplexRunErrorData<K extends ComplexRunErrorKinds> = {
    [P in ComplexRunErrorType as P['name']]: P['type'];
}[K];

function describeComplexError<
    Kind extends ComplexRunErrorKinds,
    Data extends ComplexRunErrorData<Kind>
>(kind: Kind, msg: Data): ErrorDescription {
    return {
        title: titles[kind],
        message: complexMessages[kind](msg as Data),
    };
}

export function describeError(err: RunError): ErrorDescription {
    if (typeof err === 'string') {
        return {
            title: titles[err],
            message: messages[err],
        };
    }

    if ('SaveError' in err)
        return describeComplexError('SaveError', err.SaveError);

    if ('RemoveError' in err)
        return describeComplexError('RemoveError', err.RemoveError);

    if ('FailedSpawn' in err)
        return describeComplexError('FailedSpawn', err.FailedSpawn);

    if ('WaitError' in err)
        return describeComplexError('WaitError', err.WaitError);

    return assertNever(err);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function assertNever(_: never): any {
    throw new Error();
}
