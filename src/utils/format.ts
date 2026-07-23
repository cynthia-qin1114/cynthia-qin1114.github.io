import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CURRENCY_SYMBOL, AMOUNT_DECIMALS } from '../config/constants';

/**
 * 格式化货币金额
 * @param amount 金额（元）
 * @param withSymbol 是否带货币符号
 * @returns 格式化后的金额字符串
 */
export const formatCurrency = (amount: number, withSymbol: boolean = true): string => {
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: AMOUNT_DECIMALS,
    maximumFractionDigits: AMOUNT_DECIMALS,
  });
  const sign = amount < 0 ? '-' : '';
  return withSymbol ? `${sign}${CURRENCY_SYMBOL}${formatted}` : `${sign}${formatted}`;
};

/**
 * 格式化金额（简化版，不显示符号，带正负号）
 * @param amount 金额
 * @returns 带正负号的金额字符串
 */
export const formatSignedAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: AMOUNT_DECIMALS,
    maximumFractionDigits: AMOUNT_DECIMALS,
  });
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${CURRENCY_SYMBOL}${formatted}`;
};

/**
 * 格式化百分比
 * @param value 百分比值（如 0.1234 表示 12.34%）
 * @param decimals 小数位数
 * @returns 格式化后的百分比字符串
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  const percent = value * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
};

/**
 * 格式化百分比（直接传入百分比值，如 12.34）
 * @param value 百分比值
 * @param decimals 小数位数
 * @returns 格式化后的百分比字符串
 */
export const formatPercentValue = (value: number, decimals: number = 2): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * 格式化日期（ISO -> 展示格式）
 * @param isoDate ISO 8601日期字符串
 * @param formatStr date-fns格式字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (isoDate: string, formatStr: string = 'yyyy-MM-dd'): string => {
  try {
    const date = typeof isoDate === 'string' ? parseISO(isoDate) : new Date(isoDate);
    return format(date, formatStr, { locale: zhCN });
  } catch {
    return isoDate;
  }
};

/**
 * 格式化日期时间
 * @param isoDate ISO 8601日期时间字符串
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (isoDate: string): string => {
  return formatDate(isoDate, 'yyyy-MM-dd HH:mm');
};

/**
 * 格式化月份
 * @param isoDate ISO 8601日期字符串
 * @returns 格式化后的月份字符串（如 2024年1月）
 */
export const formatMonth = (isoDate: string): string => {
  return formatDate(isoDate, 'yyyy年M月');
};

/**
 * 格式化短日期（月-日）
 * @param isoDate ISO 8601日期字符串
 * @returns 格式化后的短日期（如 01-15）
 */
export const formatShortDate = (isoDate: string): string => {
  return formatDate(isoDate, 'MM-dd');
};

/**
 * 获取月份键值（用于分组）
 * @param isoDate ISO 8601日期字符串
 * @returns 月份键值（如 2024-01）
 */
export const getMonthKey = (isoDate: string): string => {
  return formatDate(isoDate, 'yyyy-MM');
};

/**
 * 格式化数字（千分位）
 * @param value 数值
 * @param decimals 小数位数
 * @returns 格式化后的数字字符串
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * 解析金额字符串为数字
 * @param str 金额字符串
 * @returns 解析后的数字
 */
export const parseAmount = (str: string): number => {
  const cleaned = str.replace(/[¥$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};
