/**
 * 地区名中文化：Vercel 地理头返回英文地名（如 Beijing / Guangdong），
 * 展示时映射为中文。键做归一化（小写、去空格/连字符/撇号、去省/市后缀），
 * 兼容 "Guangdong Sheng"、"Inner Mongolia"、"Xi'an" 等变体；未命中的原样返回。
 */

const ZH: Record<string, string> = {
  // 省级区划
  beijing: '北京',
  shanghai: '上海',
  tianjin: '天津',
  chongqing: '重庆',
  guangdong: '广东',
  zhejiang: '浙江',
  jiangsu: '江苏',
  shandong: '山东',
  henan: '河南',
  hebei: '河北',
  sichuan: '四川',
  hubei: '湖北',
  hunan: '湖南',
  fujian: '福建',
  anhui: '安徽',
  jiangxi: '江西',
  shaanxi: '陕西',
  shanxi: '山西',
  liaoning: '辽宁',
  jilin: '吉林',
  heilongjiang: '黑龙江',
  yunnan: '云南',
  guizhou: '贵州',
  guangxi: '广西',
  hainan: '海南',
  gansu: '甘肃',
  qinghai: '青海',
  ningxia: '宁夏',
  xinjiang: '新疆',
  tibet: '西藏',
  xizang: '西藏',
  innermongolia: '内蒙古',
  neimongol: '内蒙古',
  hongkong: '香港',
  macao: '澳门',
  macau: '澳门',
  taiwan: '台湾',
  // 主要城市
  shenzhen: '深圳',
  guangzhou: '广州',
  hangzhou: '杭州',
  nanjing: '南京',
  suzhou: '苏州',
  chengdu: '成都',
  wuhan: '武汉',
  xian: '西安',
  qingdao: '青岛',
  xiamen: '厦门',
  dalian: '大连',
  jinan: '济南',
  fuzhou: '福州',
  kunming: '昆明',
  hefei: '合肥',
  shenyang: '沈阳',
  harbin: '哈尔滨',
  shijiazhuang: '石家庄',
  nanchang: '南昌',
  guiyang: '贵阳',
  nanning: '南宁',
  lanzhou: '兰州',
  haikou: '海口',
  urumqi: '乌鲁木齐',
  hohhot: '呼和浩特',
  yinchuan: '银川',
  xining: '西宁',
  lhasa: '拉萨',
  ningbo: '宁波',
  wuxi: '无锡',
  foshan: '佛山',
  dongguan: '东莞',
  changsha: '长沙',
  zhengzhou: '郑州',
  zhuhai: '珠海',
  wenzhou: '温州',
  taizhou: '台州',
  quanzhou: '泉州',
  zhongshan: '中山',
  // 常见境外（兜底常用项）
  california: '加利福尼亚',
  'newyork': '纽约',
  tokyo: '东京',
  seoul: '首尔',
  singapore: '新加坡',
  london: '伦敦',
  sydney: '悉尼',
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-'.·]+/g, '')
    .replace(/(sheng|shi|province|municipality|city|district|county|autonomousregion)$/, '');
}

/** 英文地名 → 中文；未命中返回原文 */
export function regionZh(name: string | null | undefined): string {
  if (!name) {
    return '';
  }
  const zh = ZH[normalize(name)];
  return zh ?? name;
}
