declare module 'bcryptjs' {
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compareSync(data: string, encrypted: string): boolean;
  export function hash(data: string | Buffer, salt: string | number): Promise<string>;
  export function hashSync(data: string | Buffer, salt: string | number): string;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}
