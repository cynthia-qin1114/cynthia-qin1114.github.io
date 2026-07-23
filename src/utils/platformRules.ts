import { MatchType } from '../types';

/**
 * 平台映射规则数据
 * 45个消费平台映射规则
 * 覆盖主流消费场景：支付宝、微信、电商、外卖、出行、生鲜、娱乐等
 */
export interface PlatformRule {
  id: string;
  platform: string;
  category: string;
  matchType: MatchType;
  keywords: string[];
}

/**
 * 45个平台映射规则
 * category 字段已对齐用户自定义分类体系：
 * 餐饮、交通、购物、bill、日常开销（原生鲜/娱乐/运动/快递/日用统一归入日常开销）
 */
export const defaultPlatformRules: PlatformRule[] = [
  // ===== 餐饮美食 (10) =====
  { id: 'pm_001', platform: '美团', category: '餐饮', matchType: MatchType.EXACT, keywords: ['美团', '美团外卖', '美团点评'] },
  { id: 'pm_002', platform: '饿了么', category: '餐饮', matchType: MatchType.EXACT, keywords: ['饿了么', 'eleme'] },
  { id: 'pm_003', platform: '大众点评', category: '餐饮', matchType: MatchType.EXACT, keywords: ['大众点评', '点评'] },
  { id: 'pm_004', platform: '星巴克', category: '餐饮', matchType: MatchType.EXACT, keywords: ['星巴克', 'starbucks', 'STARBUCKS'] },
  { id: 'pm_005', platform: '瑞幸咖啡', category: '餐饮', matchType: MatchType.EXACT, keywords: ['瑞幸', 'luckin', 'LUCKIN'] },
  { id: 'pm_006', platform: '麦当劳', category: '餐饮', matchType: MatchType.EXACT, keywords: ['麦当劳', 'mcdonald', 'McDonald'] },
  { id: 'pm_007', platform: '肯德基', category: '餐饮', matchType: MatchType.EXACT, keywords: ['肯德基', 'KFC', 'kfc'] },
  { id: 'pm_008', platform: '喜茶', category: '餐饮', matchType: MatchType.EXACT, keywords: ['喜茶', 'HEYTEA', 'heytea'] },
  { id: 'pm_009', platform: '支付宝-餐饮', category: '餐饮', matchType: MatchType.FUZZY, keywords: ['支付宝-餐', '支付宝-美食', '支付宝-外卖'] },
  { id: 'pm_010', platform: '微信-餐饮', category: '餐饮', matchType: MatchType.FUZZY, keywords: ['微信-餐', '微信-美食', '微信-外卖'] },

  // ===== 交通出行 (6) =====
  { id: 'pm_011', platform: '滴滴出行', category: '交通', matchType: MatchType.EXACT, keywords: ['滴滴', '滴滴出行', 'didi'] },
  { id: 'pm_012', platform: '高德地图', category: '交通', matchType: MatchType.EXACT, keywords: ['高德', '高德地图', 'amap'] },
  { id: 'pm_013', platform: '哈啰出行', category: '交通', matchType: MatchType.EXACT, keywords: ['哈啰', '哈啰出行', 'hello', '哈罗'] },
  { id: 'pm_014', platform: '美团单车', category: '交通', matchType: MatchType.EXACT, keywords: ['美团单车', '美团骑行'] },
  { id: 'pm_015', platform: '12306', category: '交通', matchType: MatchType.EXACT, keywords: ['12306', '铁路', '火车票'] },
  { id: 'pm_016', platform: '中石化', category: '交通', matchType: MatchType.EXACT, keywords: ['中石化', '中国石化', 'sinopec'] },

  // ===== 网购购物 (7) =====
  { id: 'pm_017', platform: '淘宝', category: '购物', matchType: MatchType.EXACT, keywords: ['淘宝', 'taobao'] },
  { id: 'pm_018', platform: '天猫', category: '购物', matchType: MatchType.EXACT, keywords: ['天猫', 'tmall'] },
  { id: 'pm_019', platform: '京东', category: '购物', matchType: MatchType.EXACT, keywords: ['京东', 'jd', 'JD'] },
  { id: 'pm_020', platform: '拼多多', category: '购物', matchType: MatchType.EXACT, keywords: ['拼多多', 'pdd', 'PDD'] },
  { id: 'pm_021', platform: '得物', category: '购物', matchType: MatchType.EXACT, keywords: ['得物', 'poizon', 'POIZON'] },
  { id: 'pm_022', platform: '唯品会', category: '购物', matchType: MatchType.EXACT, keywords: ['唯品会', 'vip'] },
  { id: 'pm_023', platform: '闲鱼', category: '购物', matchType: MatchType.EXACT, keywords: ['闲鱼', 'xianyu'] },

  // ===== 生鲜食品 (4) =====
  { id: 'pm_024', platform: '叮咚买菜', category: '餐饮', matchType: MatchType.EXACT, keywords: ['叮咚买菜', '叮咚', 'dingdong'] },
  { id: 'pm_025', platform: '盒马', category: '餐饮', matchType: MatchType.EXACT, keywords: ['盒马', '盒马鲜生', 'freshippo'] },
  { id: 'pm_026', platform: '朴朴', category: '餐饮', matchType: MatchType.EXACT, keywords: ['朴朴', 'pupu'] },
  { id: 'pm_027', platform: '永辉', category: '餐饮', matchType: MatchType.EXACT, keywords: ['永辉', '永辉超市', 'yonghui'] },

  // ===== 生活缴费 (4) =====
  { id: 'pm_028', platform: '水电煤缴费', category: 'bill', matchType: MatchType.FUZZY, keywords: ['电费', '水费', '燃气费', '煤气费', '水电煤'] },
  { id: 'pm_029', platform: '中石油', category: 'bill', matchType: MatchType.EXACT, keywords: ['中石油', '中国石油', 'petrochina'] },
  { id: 'pm_030', platform: '支付宝-缴费', category: 'bill', matchType: MatchType.FUZZY, keywords: ['支付宝-缴费', '支付宝-水电'] },
  { id: 'pm_031', platform: '微信-缴费', category: 'bill', matchType: MatchType.FUZZY, keywords: ['微信-缴费', '微信-水电'] },

  // ===== 娱乐休闲 (5) =====
  { id: 'pm_032', platform: '网易云音乐', category: '日常开销', matchType: MatchType.EXACT, keywords: ['网易云', '网易云音乐', 'netease'] },
  { id: 'pm_033', platform: '爱奇艺', category: '日常开销', matchType: MatchType.EXACT, keywords: ['爱奇艺', 'iqiyi'] },
  { id: 'pm_034', platform: '腾讯视频', category: '日常开销', matchType: MatchType.EXACT, keywords: ['腾讯视频', 'tencent video'] },
  { id: 'pm_035', platform: '哔哩哔哩', category: '日常开销', matchType: MatchType.EXACT, keywords: ['B站', '哔哩哔哩', 'bilibili', 'BILIBILI'] },
  { id: 'pm_036', platform: '抖音', category: '日常开销', matchType: MatchType.EXACT, keywords: ['抖音', 'douyin', 'tiktok'] },

  // ===== 运动健康 (1) =====
  { id: 'pm_037', platform: 'Keep', category: '日常开销', matchType: MatchType.EXACT, keywords: ['Keep', 'KEEP', 'keep'] },

  // ===== 快递物流 (2) =====
  { id: 'pm_038', platform: '顺丰速运', category: '日常开销', matchType: MatchType.EXACT, keywords: ['顺丰', '顺丰速运', 'sf', 'SF'] },
  { id: 'pm_039', platform: '菜鸟裹裹', category: '日常开销', matchType: MatchType.EXACT, keywords: ['菜鸟', '菜鸟裹裹', 'cainiao'] },

  // ===== 酒店旅行 (3) =====
  { id: 'pm_040', platform: '携程', category: '交通', matchType: MatchType.EXACT, keywords: ['携程', 'ctrip', 'CTRIP'] },
  { id: 'pm_041', platform: '去哪儿', category: '交通', matchType: MatchType.EXACT, keywords: ['去哪儿', 'qunar', 'QUNAR'] },
  { id: 'pm_042', platform: '飞猪', category: '交通', matchType: MatchType.EXACT, keywords: ['飞猪', 'fliggy', 'FLIGGY'] },

  // ===== 日用百货 (3) =====
  { id: 'pm_043', platform: '屈臣氏', category: '日常开销', matchType: MatchType.EXACT, keywords: ['屈臣氏', 'watsons'] },
  { id: 'pm_044', platform: '宜家', category: '日常开销', matchType: MatchType.EXACT, keywords: ['宜家', 'IKEA', 'ikea'] },
  { id: 'pm_045', platform: '小红书', category: '日常开销', matchType: MatchType.EXACT, keywords: ['小红书', 'RED', 'xiaohongshu'] },
];
