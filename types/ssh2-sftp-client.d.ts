declare module 'ssh2-sftp-client' {
  type ConnectConfig = {
    host: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: string | Buffer;
  };

  export default class SFTPClient {
    connect(config: ConnectConfig): Promise<void>;
    put(input: Buffer | string, remotePath: string): Promise<void>;
    end(): Promise<void>;
  }
}
