/**
 * UUID生成工具
 * 使用 crypto.randomUUID（现代浏览器支持）+ 降级方案
 */

/**
 * 生成UUID v4
 * 优先使用 crypto.randomUUID，降级到手动生成
 * @returns UUID字符串
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // 降级方案：基于随机数生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 生成时间戳ID（用于需要排序的场景）
 * @returns 基于时间戳的唯一ID
 */
export const generateTimestampId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

/**
 * 获取当前ISO 8601时间戳
 * @returns ISO格式的日期时间字符串
 */
export const now = (): string => {
  return new Date().toISOString();
};
