/**
 * backupCrypto.test.ts — 本地加密工具单元测试
 *
 * 覆盖：
 * - 加密后解密 roundtrip 得到原文（含中文 / 特殊字符 / 多类型 JSON）
 * - 错误密码解密抛错（GCM 认证失败）
 * - 篡改 salt / iv / ct 后解密抛错
 * - base64 编解码互逆
 * - 格式错误的 payload 抛错
 */

import { describe, it, expect } from 'vitest';
import {
  encryptToString,
  decryptToString,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './backupCrypto';

describe('backupCrypto 加解密', () => {
  it('roundtrip：加密后解密还原原文（多类型 JSON）', async () => {
    const original = JSON.stringify({ hello: 'world', n: 123, list: [1, 2, 3], nested: { a: true } });
    const enc = await encryptToString(original, 'p@ssw0rd!');
    const dec = await decryptToString(enc, 'p@ssw0rd!');
    expect(dec).toBe(original);
  });

  it('中文 / emoji / 换行 / 制表符也能还原', async () => {
    const original = '智能记账 数据备份 测试 🔐\n换行\t制表';
    const enc = await encryptToString(original, '密码');
    expect(await decryptToString(enc, '密码')).toBe(original);
  });

  it('错误密码解密抛错（GCM 认证失败）', async () => {
    const enc = await encryptToString('secret-data', 'right-password');
    await expect(decryptToString(enc, 'wrong-password')).rejects.toThrow();
  });

  it('篡改 salt / iv / ct 后解密抛错', async () => {
    const enc = await encryptToString('secret-data', 'password');

    // 篡改 ct（同长度替换字节）
    const objCt = JSON.parse(enc);
    objCt.ct = uint8ArrayToBase64(new Uint8Array(32).fill(0xab));
    await expect(decryptToString(JSON.stringify(objCt), 'password')).rejects.toThrow();

    // 篡改 iv
    const objIv = JSON.parse(enc);
    objIv.iv = uint8ArrayToBase64(new Uint8Array(12).fill(0x09));
    await expect(decryptToString(JSON.stringify(objIv), 'password')).rejects.toThrow();

    // 篡改 salt
    const objSalt = JSON.parse(enc);
    objSalt.salt = uint8ArrayToBase64(new Uint8Array(16).fill(0x00));
    await expect(decryptToString(JSON.stringify(objSalt), 'password')).rejects.toThrow();
  });

  it('base64 编解码互逆', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 64, 16, 200]);
    expect(base64ToUint8Array(uint8ArrayToBase64(bytes))).toEqual(bytes);
  });

  it('格式错误的 payload 抛错', async () => {
    await expect(decryptToString('not-json', 'password')).rejects.toThrow();
    await expect(decryptToString(JSON.stringify({ v: 1 }), 'password')).rejects.toThrow();
    await expect(
      decryptToString(JSON.stringify({ v: 2, salt: 'a', iv: 'b', ct: 'c' }), 'password'),
    ).rejects.toThrow();
  });
});
