import { jest } from '@jest/globals';

const inputValues = {
    webhook_url: 'https://discord.com/api/webhooks/test/webhook',
    color: '2105893',
    username: 'Release Changelog',
    avatar_url: 'https://example.com/avatar.png',
    content: '||@everyone||',
    release_name: 'v1.2.3',
    release_body: '## Changes\n- Added manual dispatch support\n- Verified webhook payload',
    release_html_url: 'https://github.com/owner/repo/releases/tag/v1.2.3'
};

const fetchMock = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id: 'discord-message-id' }),
    headers: {
        get: () => null
    }
}));

const coreMock = {
    getInput: jest.fn((name) => inputValues[name] || ''),
    getBooleanInput: jest.fn((name) => false),
    setFailed: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
};

const githubMock = {
    context: {
        payload: {}
    }
};

beforeEach(() => {
    fetchMock.mockClear();
    coreMock.setFailed.mockClear();
    coreMock.info.mockClear();
    coreMock.warning.mockClear();
    githubMock.context.payload = {};
});

jest.unstable_mockModule('@actions/core', () => ({
    default: coreMock
}));

jest.unstable_mockModule('@actions/github', () => ({
    default: githubMock
}));

jest.unstable_mockModule('node-fetch', () => ({
    default: fetchMock
}));

describe('manual dispatch integration', () => {
    test('run() posts a Discord embed using manual workflow inputs', async () => {
        const { run } = await import('../index.js');

        await run();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('https://discord.com/api/webhooks/test/webhook?wait=true');

        const request = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(request).toEqual({
            embeds: [{
                title: 'v1.2.3',
                url: 'https://github.com/owner/repo/releases/tag/v1.2.3',
                color: '2105893',
                description: '## Changes\n- Added manual dispatch support\n- Verified webhook payload',
                footer: {}
            }],
            username: 'Release Changelog',
            avatar_url: 'https://example.com/avatar.png',
            content: '||@everyone||'
        });

        expect(coreMock.setFailed).not.toHaveBeenCalled();
        expect(coreMock.info).toHaveBeenCalledWith('{"id":"discord-message-id"}');
    });

    test('run() tolerates a release payload with a null body', async () => {
        githubMock.context.payload.release = {
            name: 'v1.2.4',
            body: null,
            html_url: 'https://github.com/owner/repo/releases/tag/v1.2.4'
        };

        const { run } = await import('../index.js');

        await run();

        expect(fetchMock).toHaveBeenCalledTimes(1);

        const request = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(request.embeds[0]).toMatchObject({
            title: 'v1.2.4',
            url: 'https://github.com/owner/repo/releases/tag/v1.2.4',
            description: ''
        });

        expect(coreMock.setFailed).not.toHaveBeenCalled();
    });
});
