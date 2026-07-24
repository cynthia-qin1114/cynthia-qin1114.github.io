/**
 * backupCrypto.ts — 基于 Web Crypto API 的本地密码加密工具
 *
 * 设计目标：
 * - 纯函数、无 DOM 依赖，便于单测。
 * - 使用 PBKDF2(SHA-256, 随机 salt, 150000 迭代) 派生 AES-256-GCM 密钥。
 * - 不依赖任何第三方加密库；浏览器与 Node 22 的 `crypto.subtle` / `btoa` / `atob` 均可用。
 *
 * 自描述负载格式（JSON 字符串）：
 * {
 *   "v": 1,
 *   "salt": <base64>,
 *   "iv":   <base64>,
 *   "ct":   <base64 ciphertext>
 * }
 */

// ==================== 常量 ====================
/** PBKDF2 迭代次数（NIST 推荐，兼顾安全性与性能） */
const PBKDF2_ITERATIONS = 150_000;
/** 盐长度（字节） */
const SALT_BYTES = 16;
/** AES-GCM 推荐 IV 长度（字节） */
const IV_BYTES = 12;
/** 派生密钥长度（位） */
const KEY_LENGTH_BITS = 256;

// ==================== 类型 ====================
/** 加密负载结构（version 1） */
interface EncryptedPayload {
  /** 格式版本 */
  v: 1;
  /** 随机盐（base64） */
  salt: string;
  /** 初始化向量（base64） */
  iv: string;
  /** 密文（base64） */
  ct: string;
}

// ==================== base64 辅助 ====================

/**
 * 将 Uint8Array 编码为 base64 字符串
 * @param bytes 原始字节
 * @returns base64 字符串
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将 base64 字符串解码为 Uint8Array
 * @param b64 base64 字符串
 * @returns 原始字节
 */
export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ==================== 底层原语 ====================

/**
 * 获取 SubtleCrypto 实例（同时为不可用环境抛出明确错误）
 */
function getSubtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('当前环境不支持 Web Crypto API（crypto.subtle 缺失）');
  }
  return c.subtle;
}

/**
 * 通过 PBKDF2 从密码派生 AES-GCM CryptoKey
 * @param password 用户密码
 * @param salt 随机盐
 * @returns AES-256-GCM 密钥
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ==================== 对外 API ====================

/**
 * 使用密码加密明文，返回自描述 JSON 字符串
 * @param plaintext 待加密的明文字符串
 * @param password 加密密码
 * @returns `{v, salt, iv, ct}` 形式的 base64 JSON 字符串
 */
export async function encryptToString(plaintext: string, password: string): Promise<string> {
  const cryptoApi = getSubtle() && globalThis.crypto;
  if (!cryptoApi) {
    throw new Error('当前环境不支持 Web Crypto API');
  }
  const enc = new TextEncoder();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const key = await deriveKey(password, salt);
  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(plaintext),
  );

  const payload: EncryptedPayload = {
    v: 1,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ct: uint8ArrayToBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(payload);
}

/**
 * 解密自描述 JSON 字符串；密码错误或文件被篡改时抛出明确错误（GCM 认证失败）
 * @param payload `encryptToString` 产出的 JSON 字符串
 * @param password 解密密码
 * @returns 解密后的明文字符串
 * @throws Error 格式错误或密码不正确 / 文件损坏
 */
export async function decryptToString(payload: string, password: string): Promise<string> {
  let parsed: EncryptedPayload;
  try {
    parsed = JSON.parse(payload) as EncryptedPayload;
  } catch {
    throw new Error('备份文件格式错误：不是有效的加密备份');
  }

  if (
    parsed.v !== 1 ||
    typeof parsed.salt !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.ct !== 'string'
  ) {
    throw new Error('备份文件格式错误：缺少必要字段（v/salt/iv/ct）');
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ct: Uint8Array;
  try {
    salt = base64ToUint8Array(parsed.salt);
    iv = base64ToUint8Array(parsed.iv);
    ct = base64ToUint8Array(parsed.ct);
  } catch {
    throw new Error('备份文件格式错误：salt/iv/ct 编码无效');
  }

  const key = await deriveKey(password, salt);
  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await getSubtle().decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource,
    );
  } catch {
    // GCM 认证失败：密码错误 或 文件被篡改
    throw new Error('解密失败：密码错误或备份文件已损坏');
  }
  return new TextDecoder().decode(plainBuffer);
}
