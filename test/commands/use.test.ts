import UseCommand from '../../src/commands/use';
import * as fs from 'fs-extra';
import { mocked } from 'ts-jest/utils';
import { IConfig } from '@oclif/config';
import { IManifest } from '@oclif/dev-cli';

jest.mock('fs-extra');
const mockFs = mocked(fs, true);
class MockedUseCommand extends UseCommand {
  public channel!: string;

  public clientRoot!: string;

  public currentVersion!: string;

  public updatedVersion!: string;

  public fetchManifest = jest.fn();

  public downloadAndExtract = jest.fn();
}

describe('Use Command', () => {
  let commandInstance: MockedUseCommand;
  let config: IConfig;
  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true);

    config = {
      name: 'test',
      version: '1.0.0',
      channel: 'stable',
      cacheDir: '',
      commandIDs: [''],
      runHook: jest.fn(),
      topics: [],
      valid: true,
      arch: 'arm64',
      platform: 'darwin',
      plugins: [],
      commands: [],
      configDir: '',
      dataDir: '',
      pjson: {} as any,
      root: '',
      bin: 'cli',
      scopedEnvVarKey: jest.fn(),
      scopedEnvVar: jest.fn(),
    } as any;
  });

  it('when provided a channel, uses the latest version available locally', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use next
    commandInstance = new MockedUseCommand(['next'], config);

    commandInstance.fetchManifest.mockResolvedValue({});

    await commandInstance.run();

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(commandInstance.updatedVersion).toBe('1.0.0-next.3');
    expect(commandInstance.channel).toBe('next');
  });

  it('when provided stable channel, uses only release versions', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.3',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use next
    commandInstance = new MockedUseCommand(['stable'], config);

    commandInstance.fetchManifest.mockResolvedValue({});

    await commandInstance.run();

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(commandInstance.updatedVersion).toBe('1.0.3');
    expect(commandInstance.channel).toBe('stable');
  });

  it('when provided a version, will directly switch to it locally', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use '1.0.0-alpha.0'
    commandInstance = new MockedUseCommand(['1.0.0-alpha.0'], config);

    commandInstance.fetchManifest.mockResolvedValue({
      channel: 'alpha',
    } as IManifest);

    await commandInstance.run();

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(commandInstance.updatedVersion).toBe('1.0.0-alpha.0');
  });

  it('will print a warning when the requested static version is not available locally', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use '1.0.0-alpha.3'
    commandInstance = new MockedUseCommand(['1.0.0-alpha.3'], config);

    commandInstance.fetchManifest.mockResolvedValue({});

    let err;

    try {
      await commandInstance.run();
    } catch (error) {
      err = error;
    }

    const localVersionsMsg = `Locally installed versions available: \n${[
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ]
      .map((version) => `\t${version}`)
      .join('\n')}\n`;

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(err.message).toBe(
      `Requested version could not be found locally. ${localVersionsMsg}`,
    );
  });

  it('will ignore partials when trying to update to stable', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.2.partial.0000',
      '1.0.1.partial.0000',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use '1.0.0-alpha.0'
    commandInstance = new MockedUseCommand(['stable'], config);

    commandInstance.fetchManifest.mockResolvedValue({
      channel: 'stable',
    } as IManifest);

    await commandInstance.run();

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(commandInstance.updatedVersion).toBe('1.0.1');
  });

  it('will ignore partials when trying to update to a prerelease', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.2.partial.0000',
      '1.0.1.partial.0000',
      '1.0.0-alpha.0',
      '1.0.0-alpha.1.partial.0',
      '1.0.0-alpha.2.partial.12',
    ] as any);

    // oclif-example use '1.0.0-alpha.0'
    commandInstance = new MockedUseCommand(['alpha'], config);

    commandInstance.fetchManifest.mockResolvedValue({
      channel: 'stable',
    } as IManifest);

    await commandInstance.run();

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(commandInstance.updatedVersion).toBe('1.0.0-alpha.0');
  });

  it('will print a warning when the requested channel is not available locally', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use test
    commandInstance = new MockedUseCommand(['beta'], config);

    commandInstance.fetchManifest.mockResolvedValue({});

    let err;

    try {
      await commandInstance.run();
    } catch (error) {
      err = error;
    }

    const localVersionsMsg = `Locally installed versions available: \n${[
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ]
      .map((version) => `\t${version}`)
      .join('\n')}\n`;

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(err.message).toBe(
      `Requested version could not be found locally. ${localVersionsMsg}`,
    );
  });

  it('will throw an error when invalid channel is provided', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use test
    commandInstance = new MockedUseCommand(['test'], config);

    commandInstance.fetchManifest.mockResolvedValue({});

    let err;

    try {
      await commandInstance.run();
    } catch (error) {
      err = error;
    }

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(err.message).toBe(
      'Invalid argument provided: test. Please specify either a valid channel (alpha, beta, next, stable) or an explicit version (ex. 2.68.13)',
    );
  });

  it('will throw an error with displayed versions when no argument is provided', async () => {
    mockFs.readdirSync.mockReturnValue([
      '1.0.0-next.2',
      '1.0.0-next.3.testing',
      '1.0.1',
      '1.0.0-alpha.3.12345',
      '1.0.0-alpha.0.partial',
      '1.0.0-alpha.0',
    ] as any);

    // oclif-example use test
    commandInstance = new MockedUseCommand([], config);

    commandInstance.fetchManifest.mockResolvedValue({});

    let err;

    try {
      await commandInstance.run();
    } catch (error) {
      err = error;
    }
    const localVersionsMsg = `No version or channel was specified. Please choose from the following:\n${[
      'stable',
      'alpha',
      'beta',
      'next',
      '1.0.0-next.2',
      '1.0.0-next.3',
      '1.0.1',
      '1.0.0-alpha.3',
      '1.0.0-alpha.0',
    ]
      .map((version) => `\t${version}`)
      .join('\n')}`;

    expect(commandInstance.downloadAndExtract).not.toBeCalled();
    expect(err.message).toBe(localVersionsMsg);
  });
});
