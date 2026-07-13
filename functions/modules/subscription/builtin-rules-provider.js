import { groupNodeLinesByRegion } from './region-groups.js';

/**
 * 策略组标准名称常量
 */
export const DEFAULT_SELECT_GROUP = '🚀 节点选择';
export const DEFAULT_RELAY_GROUP = '🌍 总出口';
export const AUTO_SELECT_GROUP = '♻️ 自动选择';
export const FALLBACK_GROUP = '🔯 故障转移';
export const MANUAL_SELECT_GROUP = '👋 手动切换';
export const MATRIX_PROXY_GROUP = 'PROXY';
export const MATRIX_AUTO_GROUP = '♻️ 自动测速';
export const MATRIX_FINAL_GROUP = 'FINAL';

const MATRIX_GROUP_ICON_BASE = 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color';
const MATRIX_GROUP_ICONS = {
    [MATRIX_PROXY_GROUP]: `${MATRIX_GROUP_ICON_BASE}/Proxy.png`,
    'Emby代理': `${MATRIX_GROUP_ICON_BASE}/Emby.png`,
    TG: `${MATRIX_GROUP_ICON_BASE}/Telegram.png`,
    AI: `${MATRIX_GROUP_ICON_BASE}/AI.png`,
    YOUTUBE: `${MATRIX_GROUP_ICON_BASE}/YouTube.png`,
    TIKTOK: `${MATRIX_GROUP_ICON_BASE}/TikTok.png`,
    [MATRIX_FINAL_GROUP]: `${MATRIX_GROUP_ICON_BASE}/Final.png`,
    BLOCK: `${MATRIX_GROUP_ICON_BASE}/Reject.png`,
    APPLE: `${MATRIX_GROUP_ICON_BASE}/Apple.png`,
    BANK: `${MATRIX_GROUP_ICON_BASE}/PayPal.png`,
    FINANCE: `${MATRIX_GROUP_ICON_BASE}/PayPal.png`,
    'FAKE-LOCATION': `${MATRIX_GROUP_ICON_BASE}/Rainbow.png`,
    [MATRIX_AUTO_GROUP]: `${MATRIX_GROUP_ICON_BASE}/Speedtest.png`
};

export const MATRIX_BASE_TARGETS = [
    'DIRECT',
    'REJECT',
    'PROXY',
    'Emby代理',
    'TG',
    'AI',
    'YOUTUBE',
    'TIKTOK',
    'FINAL',
    'BLOCK',
    'APPLE',
    'BANK',
    'FINANCE',
    'FAKE-LOCATION',
    MATRIX_AUTO_GROUP
];

const MATRIX_RESERVED_GROUPS = new Set([
    ...MATRIX_BASE_TARGETS,
    'REJECT-DROP',
    MATRIX_PROXY_GROUP,
    MATRIX_FINAL_GROUP
]);

const MATRIX_CUSTOM_RULE_TYPES = new Set([
    'DOMAIN-SUFFIX',
    'DOMAIN',
    'DOMAIN-KEYWORD',
    'IP-CIDR',
    'IP-CIDR6',
    'GEOIP'
]);

function cleanMatrixText(value = '', maxLength = 120) {
    return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/["'\\]/g, '')
        .trim()
        .slice(0, maxLength);
}

export function normalizeCustomMatrixGroups(groups = []) {
    if (!Array.isArray(groups)) return [];
    const seen = new Set();
    const normalized = [];

    for (const item of groups.slice(0, 30)) {
        const name = cleanMatrixText(item?.name, 80);
        if (!name || seen.has(name) || MATRIX_RESERVED_GROUPS.has(name)) continue;
        const type = String(item?.type || 'select').toLowerCase() === 'url-test' ? 'url-test' : 'select';
        seen.add(name);
        normalized.push({ name, type });
    }

    return normalized;
}

export function normalizeCustomMatrixRules(rules = [], groups = []) {
    if (!Array.isArray(rules)) return [];
    const customTargets = normalizeCustomMatrixGroups(groups).map(group => group.name);
    const validTargets = new Set([...customTargets, ...MATRIX_BASE_TARGETS]);
    const normalized = [];

    for (const item of rules.slice(0, 200)) {
        const type = String(item?.type || '').trim().toUpperCase();
        const value = cleanMatrixText(item?.value, 180).replace(/,/g, '');
        const target = cleanMatrixText(item?.target, 80);
        if (!MATRIX_CUSTOM_RULE_TYPES.has(type) || !value || !validTargets.has(target)) continue;
        normalized.push(`${type},${value},${target}`);
    }

    return normalized;
}

function withMatrixIcon(group) {
    const icon = MATRIX_GROUP_ICONS[group?.name];
    return icon ? { ...group, icon } : group;
}

/**
 * 自动生成地区策略组（通用中间格式）
 * @param {Object[]} proxies 
 * @returns {Array} 地区分组数据
 */
function generateRegionData(proxies, options = {}) {
    // [智能升级] 直接传递代理对象数组，region-groups 现在能识别 metadata
    return groupNodeLinesByRegion(proxies, options);
}

/**
 * 清理策略组中不存在的成员引用
 * @param {Array} proxyGroups - 策略组对象数组
 * @param {Array} proxies - 可用代理对象数组
 * @returns {Array} 清理后的策略组数组
 */
export function pruneProxyGroups(proxyGroups, proxies) {
    const validTargetNames = new Set([
        ...proxies.map(p => p.tag || p.name),
        ...proxyGroups.map(g => g.name),
        DEFAULT_SELECT_GROUP,
        DEFAULT_RELAY_GROUP,
        AUTO_SELECT_GROUP,
        FALLBACK_GROUP,
        MANUAL_SELECT_GROUP,
        ...['DIRECT', 'REJECT', 'REJECT-DROP', 'ANY'] // 各平台通用保留字
    ]);

    return proxyGroups.map(group => {
        if (!Array.isArray(group.proxies)) return group;
        
        const newProxies = group.proxies.filter(member => {
            // 核心修复 1：禁止策略组引用自身
            if (member === group.name) return false;
            
            // 核心修复 2：禁止任何非顶级组通过正则表达式包含顶级入口组名，防止回环（解决 .* 匹配问题）
            // 如果成员名是顶级组名，且当前组不是顶级组自身，且该成员是通过正则匹配推断出的（或显式声明的）
            if (member === DEFAULT_SELECT_GROUP || member === DEFAULT_RELAY_GROUP) {
                // 顶级组绝不允许作为其他非顶级组的成员，尤其是手动切换/业务分流组
                return false;
            }

            // regex 过滤器的内容不应在此时剔除
            if (typeof member === 'string' && (member.startsWith('(') || member.includes('.*') || member.includes('+') || member.includes('$'))) {
                return true;
            }
            return validTargetNames.has(member);
        });

        // 兜底逻辑
        return {
            ...group,
            proxies: newProxies.length > 0 ? newProxies : ['DIRECT']
        };
    });
}

/**
 * 内部辅助：生成地区相关的策略组定义
 */
function _generateRegionGroups(proxies, options = {}) {
    const regions = generateRegionData(proxies, options);
    const regionSelectGroups = [];   // 地区选择组（顶级按钮）
    const regionSupportGroups = []; // 地区辅助组（隐藏/末尾）
    const regionNames = [];

    regions.forEach(r => {
        // 为每个地区生成一个更简洁的辅助测速组名
        const autoGroupName = `⚡️ ${r.name.replace('节点', '')} - 自动测速`;
        regionNames.push(r.name);

        // [地区选择组] 内部包含测速组和具体节点
        regionSelectGroups.push({ 
            name: r.name, 
            type: 'select', 
            proxies: [autoGroupName, ...r.tags] 
        });

        // [地区辅助测速组]
        regionSupportGroups.push({ 
            name: autoGroupName, 
            type: 'url-test', 
            proxies: r.tags,
            hidden: true,
            options: { url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 50 }
        });
    });

    return { regionSelectGroups, regionSupportGroups, regionNames };
}

/**
 * 策略组工厂
 */
export const POLICY_GROUPS = {
    // 基础配置：精简版
    BASE: (proxies, options = {}) => {
        const proxyNames = proxies.map(p => p.tag || p.name);
        return [
            { name: DEFAULT_SELECT_GROUP, type: 'select', proxies: [AUTO_SELECT_GROUP, FALLBACK_GROUP, MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: AUTO_SELECT_GROUP, type: 'url-test', proxies: proxyNames },
            { name: FALLBACK_GROUP, type: 'fallback', proxies: proxyNames },
            { name: MANUAL_SELECT_GROUP, type: 'select', proxies: proxyNames }
        ];
    },
    // 标准配置：全能型
    STD: (proxies, options = {}) => {
        const proxyNames = proxies.map(p => p.tag || p.name);
        const { regionSelectGroups, regionSupportGroups, regionNames } = _generateRegionGroups(proxies, options);
        
        return [
            { name: DEFAULT_SELECT_GROUP, type: 'select', proxies: [AUTO_SELECT_GROUP, FALLBACK_GROUP, MANUAL_SELECT_GROUP, ...regionNames, 'DIRECT'] },
            { name: AUTO_SELECT_GROUP, type: 'url-test', proxies: proxyNames },
            { name: FALLBACK_GROUP, type: 'fallback', proxies: proxyNames },
            { name: MANUAL_SELECT_GROUP, type: 'select', proxies: proxyNames },
            ...regionSelectGroups,
            { name: '🤖 智能 AI', type: 'select', proxies: ['🇺🇸 美国节点', '🇸🇬 狮城节点', '🇯🇵 日本节点', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🎬 视频广告', type: 'select', proxies: ['REJECT', 'DIRECT'] },
            { name: '🎥 流媒体', type: 'select', proxies: ['🇸🇬 狮城节点', '🇭🇰 香港节点', '🇹🇼 台湾节点', '🇯🇵 日本节点', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP] },
            { name: 'Ⓜ️ Microsoft', type: 'select', proxies: ['DIRECT', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP] },
            { name: '📲 Telegram', type: 'select', proxies: [AUTO_SELECT_GROUP, '🇸🇬 狮城节点', '🇭🇰 香港节点', MANUAL_SELECT_GROUP, 'DIRECT'] },
            ...regionSupportGroups
        ];
    },
    // 完整配置：细化分类
    FULL: (proxies, options = {}) => {
        const proxyNames = proxies.map(p => p.tag || p.name);
        const { regionSelectGroups, regionSupportGroups, regionNames } = _generateRegionGroups(proxies, options);
        
        return [
            { name: DEFAULT_SELECT_GROUP, type: 'select', proxies: [AUTO_SELECT_GROUP, FALLBACK_GROUP, MANUAL_SELECT_GROUP, ...regionNames, 'DIRECT'] },
            { name: AUTO_SELECT_GROUP, type: 'url-test', proxies: proxyNames },
            { name: FALLBACK_GROUP, type: 'fallback', proxies: proxyNames },
            { name: MANUAL_SELECT_GROUP, type: 'select', proxies: proxyNames },
            ...regionSelectGroups,
            // 核心修复：业务组直接引用具体地区组或自动选择组，不引用 DEFAULT_SELECT_GROUP 
            { name: '🤖 智能 AI', type: 'select', proxies: ['🇺🇸 美国节点', '🇸🇬 狮城节点', '🇯🇵 日本节点', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🎬 视频广告', type: 'select', proxies: ['REJECT', 'DIRECT'] },
            { name: '🎥 流媒体', type: 'select', proxies: ['🇸🇬 狮城节点', '🇭🇰 香港节点', '🇹🇼 台湾节点', '🇯🇵 日本节点', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP] },
            { name: 'Ⓜ️ Microsoft', type: 'select', proxies: ['DIRECT', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP] },
            { name: '📲 Telegram', type: 'select', proxies: [AUTO_SELECT_GROUP, '🇸🇬 狮城节点', '🇭🇰 香港节点', MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🎧 Spotify', type: 'select', proxies: [AUTO_SELECT_GROUP, '🇸🇬 狮城节点', MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🎮 游戏平台', type: 'select', proxies: ['DIRECT', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP] },
            ...regionSupportGroups
        ];
    },
    // 链式代理：中转优化
    RELAY: (proxies, options = {}) => {
        const proxyNames = proxies.map(p => p.tag || p.name);
        const { regionSelectGroups, regionSupportGroups, regionNames } = _generateRegionGroups(proxies, options);
        
        return [
            { name: DEFAULT_RELAY_GROUP, type: 'select', proxies: ['🔗 链式代理', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, '🚀 常用节点', ...regionNames, 'DIRECT'] },
            // 保持 provider 层为通用 select，不在抽象层输出 relay 语义。
            // 否则模板渲染/普通 Clash 路径可能把它转换成 Mihomo 专属 dialer-proxy，导致客户端拉取失败。
            { name: '🔗 链式代理', type: 'select', proxies: ['入口节点', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT', ...proxyNames] },
            { name: '入口节点', type: 'select', proxies: [AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT', ...proxyNames] },
            ...regionSelectGroups,
            { name: '🚀 常用节点', type: 'select', proxies: [AUTO_SELECT_GROUP, FALLBACK_GROUP, MANUAL_SELECT_GROUP, ...regionNames, 'DIRECT'] },
            { name: AUTO_SELECT_GROUP, type: 'url-test', proxies: proxyNames },
            { name: FALLBACK_GROUP, type: 'fallback', proxies: proxyNames },
            { name: MANUAL_SELECT_GROUP, type: 'select', proxies: proxyNames },
            // 核心修复：链式版的分流也禁止回引 DEFAULT_RELAY_GROUP，统一使用地区组或常用节点
            { name: '🎬 视频广告', type: 'select', proxies: ['REJECT', 'DIRECT'] },
            { name: '🎥 流媒体', type: 'select', proxies: ['🇸🇬 狮城节点', '🇭🇰 香港节点', '🇹🇼 台湾节点', '🇯🇵 日本节点', AUTO_SELECT_GROUP, MANUAL_SELECT_GROUP, 'DIRECT'] },
            { name: '🤖 智能 AI', type: 'select', proxies: ['🔗 链式代理', '🇺🇸 美国节点', '🇸🇬 狮城节点', '🇯🇵 日本节点', '🚀 常用节点', 'DIRECT'] },
            { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', '🚀 常用节点', AUTO_SELECT_GROUP] },
            { name: 'Ⓜ️ Microsoft', type: 'select', proxies: ['DIRECT', '🚀 常用节点', AUTO_SELECT_GROUP] },
            ...regionSupportGroups
        ];
    },
    // Clash Matrix Studio 专属分流：沿用 V5.x 的业务组、测速链接和直连/代理偏好。
    MATRIX: (proxies, options = {}) => {
        const proxyNames = proxies.map(p => p.tag || p.name);
        const nodeMembers = proxyNames.length > 0 ? proxyNames : ['DIRECT'];
        const proxyMembers = [MATRIX_AUTO_GROUP, 'DIRECT', ...proxyNames];
        const proxyOrDirect = [MATRIX_PROXY_GROUP, 'DIRECT', ...proxyNames];
        const directFirst = ['DIRECT', MATRIX_PROXY_GROUP, ...proxyNames];
        const customGroups = normalizeCustomMatrixGroups(options.customMatrixGroups);
        const customPolicyGroups = customGroups.map(group => ({
            name: group.name,
            type: group.type,
            proxies: group.type === 'url-test' ? [MATRIX_PROXY_GROUP, 'DIRECT', ...nodeMembers] : proxyOrDirect,
            ...(group.type === 'url-test' ? { options: { url: 'http://www.google.com/blank.html', interval: 300, tolerance: 50 } } : {}),
            icon: `${MATRIX_GROUP_ICON_BASE}/Available.png`
        }));

        return [
            { name: MATRIX_PROXY_GROUP, type: 'select', proxies: proxyMembers },
            { name: 'Emby代理', type: 'select', proxies: proxyOrDirect },
            { name: 'TG', type: 'select', proxies: proxyOrDirect },
            { name: 'AI', type: 'select', proxies: proxyOrDirect },
            { name: 'YOUTUBE', type: 'select', proxies: proxyOrDirect },
            { name: 'TIKTOK', type: 'select', proxies: proxyOrDirect },
            { name: MATRIX_FINAL_GROUP, type: 'select', proxies: proxyOrDirect },
            { name: 'BLOCK', type: 'select', proxies: ['REJECT', 'DIRECT'] },
            { name: 'APPLE', type: 'select', proxies: directFirst },
            { name: 'BANK', type: 'select', proxies: directFirst },
            { name: 'FINANCE', type: 'select', proxies: directFirst },
            { name: 'FAKE-LOCATION', type: 'select', proxies: proxyOrDirect },
            ...customPolicyGroups,
            {
                name: MATRIX_AUTO_GROUP,
                type: 'url-test',
                proxies: nodeMembers,
                options: { url: 'http://www.google.com/blank.html', interval: 300, tolerance: 50 }
            }
        ].map(withMatrixIcon);
    }
};

/**
 * 远程规则源配置 (对齐各平台最高性能格式)
 */
const SING_GEOSITE_BASE = 'https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set';
const ACCADEMIA_BASE = 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main';
const accademia = (name, path, behavior = 'domain') => ({
    name,
    clash: `${ACCADEMIA_BASE}/${path}`,
    behavior
});

export const REMOTE_SOURCES = {
    ADS: {
        name: '广告拦截',
        clash: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/BanAD.yaml',
        singbox: `${SING_GEOSITE_BASE}/geosite-category-ads-all.srs`,
        surge: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
        quanx: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list'
    },
    STREAM: {
        name: '流媒体',
        clash: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Netflix.yaml', // 示例，实际使用聚合源
        singbox: `${SING_GEOSITE_BASE}/geosite-netflix.srs`,
        surge: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Netflix.list'
    },
    SOCIAL: {
        name: '社交媒体',
        clash: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Telegram.yaml',
        singbox: `${SING_GEOSITE_BASE}/geosite-telegram.srs`,
        surge: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list'
    },
    APPLE: {
        name: '苹果服务',
        clash: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Apple.yaml',
        singbox: `${SING_GEOSITE_BASE}/geosite-apple.srs`,
        surge: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list'
    },
    MICROSOFT: {
        name: '微软服务',
        clash: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Microsoft.yaml',
        singbox: `${SING_GEOSITE_BASE}/geosite-microsoft.srs`,
        surge: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
        quanx: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list'
    },
    AI: {
        name: '智能 AI',
        clash: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/OpenAi.yaml',
        singbox: `${SING_GEOSITE_BASE}/geosite-openai.srs`,
        surge: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list',
        quanx: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list'
    },
    BM_TELEGRAM: {
        name: 'Telegram',
        clash: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.yaml',
        behavior: 'classical'
    },
    BM_YOUTUBE: {
        name: 'YouTube',
        clash: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.yaml',
        behavior: 'classical'
    },
    BM_OPENAI: {
        name: 'OpenAI',
        clash: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.yaml',
        behavior: 'classical'
    },
    BM_CLAUDE: {
        name: 'Claude',
        clash: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Claude/Claude.yaml',
        behavior: 'classical'
    },
    BM_BILIBILI: {
        name: 'BiliBili',
        clash: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml',
        behavior: 'classical'
    },
    BM_TIKTOK: {
        name: 'TikTok',
        clash: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/TikTok/TikTok.yaml',
        behavior: 'classical'
    },
    PRE_REPAIR_EASY_PRIVACY_DIRECT: accademia('PreRepair EasyPrivacy DIRECT', 'PreRepairEasyPrivacy/PreRepairEasyPrivacy_DIRECT.yaml', 'classical'),
    PRE_REPAIR_EASY_PRIVACY_PROXY: accademia('PreRepair EasyPrivacy PROXY', 'PreRepairEasyPrivacy/PreRepairEasyPrivacy_PROXY.yaml', 'classical'),
    PRE_REPAIR_EASY_PRIVACY_REJECT: accademia('PreRepair EasyPrivacy REJECT', 'PreRepairEasyPrivacy/PreRepairEasyPrivacy_REJECT.yaml', 'classical'),
    BLOCK_HTTP_DNS_PLUS: {
        name: 'BlockHttpDNSPlus',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/BlockHttpDNSPlus/BlockHttpDNSPlus.yaml',
        behavior: 'classical'
    },
    CHINA_DNS_DOMAIN: {
        name: 'ChinaDNS Domain',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/ChinaDNS/ChinaDNS_Domain.yaml',
        behavior: 'domain'
    },
    CHINA_DNS_IP: {
        name: 'ChinaDNS IP',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/ChinaDNS/ChinaDNS_IP.yaml',
        behavior: 'ipcidr'
    },
    HIJACKING_PLUS: {
        name: 'HijackingPlus',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/HijackingPlus/HijackingPlus.yaml',
        behavior: 'classical'
    },
    GEMINI_DOMAIN: {
        name: 'Gemini',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Gemini/Gemini_Domain.yaml',
        behavior: 'domain'
    },
    GROK_DOMAIN: {
        name: 'Grok',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Grok/Grok_Domain.yaml',
        behavior: 'domain'
    },
    COPILOT_DOMAIN: {
        name: 'Copilot',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Copilot/Copilot_Domain.yaml',
        behavior: 'domain'
    },
    APPLE_AI_DOMAIN: {
        name: 'Apple AI',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/AppleAI/AppleAI_Domain.yaml',
        behavior: 'domain'
    },
    APPLE_NEWS_DOMAIN: accademia('Apple News', 'AppleNews/AppleNews_Domain.yaml'),
    APPLE_DOMAIN: {
        name: 'Apple Domain',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Apple/Apple_Domain.yaml',
        behavior: 'domain'
    },
    APPLE_IP: {
        name: 'Apple IP',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Apple/Apple_IP.yaml',
        behavior: 'ipcidr'
    },
    MICROSOFT_APPS_DOMAIN: {
        name: 'Microsoft Apps',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/MicrosoftAPPs/MicrosoftAPPs_Domain.yaml',
        behavior: 'domain'
    },
    ALIPAN_DOMAIN: accademia('Alipan', 'Alipan/Alipan_Domain.yaml'),
    BAIDU_NETDISK_DOMAIN: accademia('Baidu NetDisk', 'BaiduNetDisk/BaiduNetDisk_Domain.yaml'),
    WEIYUN_DOMAIN: accademia('WeiYun Domain', 'WeiYun/WeiYun_Domain.yaml'),
    WEIYUN_IP: accademia('WeiYun IP', 'WeiYun/WeiYun_IP.yaml', 'ipcidr'),
    AQARA_CN_DOMAIN: {
        name: 'Aqara CN',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Aqara/AqaraCN._Domain.yaml',
        behavior: 'domain'
    },
    AQARA_GLOBAL_DOMAIN: {
        name: 'Aqara Global',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Aqara/AqaraGlobal._Domain.yaml',
        behavior: 'domain'
    },
    AQARA_GLOBAL_IP: {
        name: 'Aqara Global IP',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Aqara/AqaraGlobal._IP.yaml',
        behavior: 'ipcidr'
    },
    UNSUPPORT_VPN_DOMAIN: accademia('Unsupport VPN', 'UnsupportVPN/UnsupportVPN_Domain.yaml'),
    BANK_AU_DOMAIN: accademia('Bank AU', 'Bank/BankAU_Domain.yaml'),
    BANK_CA_DOMAIN: accademia('Bank CA', 'Bank/BankCA_Domain.yaml'),
    BANK_DE_DOMAIN: accademia('Bank DE', 'Bank/BankDE_Domain.yaml'),
    BANK_FR_DOMAIN: accademia('Bank FR', 'Bank/BankFR_Domain.yaml'),
    BANK_HK_DOMAIN: accademia('Bank HK', 'Bank/BankHK_Domain.yaml'),
    BANK_JP_DOMAIN: accademia('Bank JP', 'Bank/BankJP_Domain.yaml'),
    BANK_NL_DOMAIN: accademia('Bank NL', 'Bank/BankNL_Domain.yaml'),
    BANK_SG_DOMAIN: accademia('Bank SG', 'Bank/BankSG_Domain.yaml'),
    BANK_UK_DOMAIN: accademia('Bank UK', 'Bank/BankUK_Domain.yaml'),
    BANK_US_DOMAIN: {
        name: 'Bank US',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/Bank/BankUS_Domain.yaml',
        behavior: 'domain'
    },
    PAYPAL: {
        name: 'PayPal',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/VirtualFinance/Paypal.yaml',
        behavior: 'classical'
    },
    WISE: {
        name: 'Wise',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/VirtualFinance/Wise.yaml',
        behavior: 'classical'
    },
    MONZO: accademia('Monzo', 'VirtualFinance/Monzo.yaml', 'classical'),
    REVOLUT: accademia('Revolut', 'VirtualFinance/Revolut.yaml', 'classical'),
    HOMEIP_JP: accademia('Home IP JP', 'HomeIP/HomeIPJP.yaml', 'classical'),
    HOMEIP_US: accademia('Home IP US', 'HomeIP/HomeIPUS.yaml', 'classical'),
    SIGNAL_DOMAIN: accademia('Signal', 'Signal/Signal_Domain.yaml'),
    KWAI_DOMAIN: accademia('Kwai', 'Kwai/Kwai_Domain.yaml'),
    PORNHUB_DOMAIN: accademia('Pornhub', 'Pornhub/Pornhub_Domain.yaml'),
    WAYBACK_MACHINE_DOMAIN: accademia('Wayback Machine Domain', 'WaybackMachine/WaybackMachine_Domain.yaml'),
    WAYBACK_MACHINE_IP: accademia('Wayback Machine IP', 'WaybackMachine/WaybackMachine_IP.yaml', 'ipcidr'),
    FASTLY_IP: accademia('Fastly IP', 'Fastly/Fastly_IP.yaml', 'ipcidr'),
    PARSEC_DOMAIN: accademia('Parsec', 'Parsec/Parsec_Domain.yaml'),
    RUSTDESK_DOMAIN: accademia('RustDesk', 'RustDesk/RustDesk_Domain.yaml'),
    MAC_APP_UPGRADE_DOMAIN: accademia('Mac App Upgrade', 'MacAppUpgrade/MacAppUpgrade_Domain.yaml'),
    EMULE_SERVER_IP: accademia('eMule Server IP', 'eMuleServer/eMuleServer_IP.yaml', 'ipcidr'),
    GLOBAL_DNS_DOMAIN: accademia('Global DNS Domain', 'GlobalDNS/GlobalDNS_Domain.yaml'),
    GLOBAL_DNS_IP: accademia('Global DNS IP', 'GlobalDNS/GlobalDNS_IP.yaml', 'ipcidr'),
    FAKE_LOCATION_BILIBILI: {
        name: 'FakeLocation BiliBili',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/FakeLocation/FakeLocationBiliBili.yaml',
        behavior: 'classical'
    },
    FAKE_LOCATION_DOUBAN: accademia('FakeLocation DouBan', 'FakeLocation/FakeLocationDouBan.yaml', 'classical'),
    FAKE_LOCATION_DOUYIN: accademia('FakeLocation DouYin', 'FakeLocation/FakeLocationDouYin.yaml', 'classical'),
    FAKE_LOCATION_KUAISHOU: accademia('FakeLocation KuaiShou', 'FakeLocation/FakeLocationKuaiShou.yaml', 'classical'),
    FAKE_LOCATION_TIEBA: accademia('FakeLocation TieBa', 'FakeLocation/FakeLocationTieBa.yaml', 'classical'),
    FAKE_LOCATION_WEIBO: accademia('FakeLocation WeiBo', 'FakeLocation/FakeLocationWeiBo.yaml', 'classical'),
    FAKE_LOCATION_XIGUA: accademia('FakeLocation XiGua', 'FakeLocation/FakeLocationXiGua.yaml', 'classical'),
    FAKE_LOCATION_XIANYU: accademia('FakeLocation XianYu', 'FakeLocation/FakeLocationXianYu.yaml', 'classical'),
    FAKE_LOCATION_XIAOHONGSHU: accademia('FakeLocation XiaoHongShu', 'FakeLocation/FakeLocationXiaoHongShu.yaml', 'classical'),
    FAKE_LOCATION_ZHIHU: accademia('FakeLocation ZhiHu', 'FakeLocation/FakeLocationZhiHu.yaml', 'classical'),
    GEO_ROUTING_AFRICA_CENTRAL_CCTLD_DOMAIN: accademia('GeoRouting Africa Central ccTLD', 'GeoRouting_For_Domain/GeoRouting_Africa_Central_ccTLD_Domain.yaml'),
    GEO_ROUTING_AFRICA_EAST_CCTLD_DOMAIN: accademia('GeoRouting Africa East ccTLD', 'GeoRouting_For_Domain/GeoRouting_Africa_East_ccTLD_Domain.yaml'),
    GEO_ROUTING_AFRICA_NORTH_CCTLD_DOMAIN: accademia('GeoRouting Africa North ccTLD', 'GeoRouting_For_Domain/GeoRouting_Africa_North_ccTLD_Domain.yaml'),
    GEO_ROUTING_AFRICA_SOUTH_CCTLD_DOMAIN: accademia('GeoRouting Africa South ccTLD', 'GeoRouting_For_Domain/GeoRouting_Africa_South_ccTLD_Domain.yaml'),
    GEO_ROUTING_AFRICA_WEST_CCTLD_DOMAIN: accademia('GeoRouting Africa West ccTLD', 'GeoRouting_For_Domain/GeoRouting_Africa_West_ccTLD_Domain.yaml'),
    GEO_ROUTING_AMERICA_NORTH_CCTLD_DOMAIN: accademia('GeoRouting America North ccTLD', 'GeoRouting_For_Domain/GeoRouting_America_North_ccTLD_Domain.yaml'),
    GEO_ROUTING_AMERICA_SOUTH_CCTLD_DOMAIN: accademia('GeoRouting America South ccTLD', 'GeoRouting_For_Domain/GeoRouting_America_South_ccTLD_Domain.yaml'),
    GEO_ROUTING_ANTARCTICA_CCTLD_DOMAIN: accademia('GeoRouting Antarctica ccTLD', 'GeoRouting_For_Domain/GeoRouting_Antarctica_ccTLD_Domain.yaml'),
    GEO_ROUTING_ASIA_CENTRAL_CCTLD_DOMAIN: accademia('GeoRouting Asia Central ccTLD', 'GeoRouting_For_Domain/GeoRouting_Asia_Central_ccTLD_Domain.yaml'),
    GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN: accademia('GeoRouting Asia China ccTLD', 'GeoRouting_For_Domain/GeoRouting_Asia_China_ccTLD_Domain.yaml'),
    GEO_ROUTING_ASIA_EASTSOUTH_CCTLD_DOMAIN: accademia('GeoRouting Asia EastSouth ccTLD', 'GeoRouting_For_Domain/GeoRouting_Asia_EastSouth_ccTLD_Domain.yaml'),
    GEO_ROUTING_ASIA_EAST_CCTLD_DOMAIN: accademia('GeoRouting Asia East ccTLD', 'GeoRouting_For_Domain/GeoRouting_Asia_East_ccTLD_Domain.yaml'),
    GEO_ROUTING_ASIA_SOUTH_CCTLD_DOMAIN: accademia('GeoRouting Asia South ccTLD', 'GeoRouting_For_Domain/GeoRouting_Asia_South_ccTLD_Domain.yaml'),
    GEO_ROUTING_ASIA_WEST_CCTLD_DOMAIN: accademia('GeoRouting Asia West ccTLD', 'GeoRouting_For_Domain/GeoRouting_Asia_West_ccTLD_Domain.yaml'),
    GEO_ROUTING_EUROPE_EAST_CCTLD_DOMAIN: accademia('GeoRouting Europe East ccTLD', 'GeoRouting_For_Domain/GeoRouting_Europe_East_ccTLD_Domain.yaml'),
    GEO_ROUTING_EUROPE_WEST_CCTLD_DOMAIN: accademia('GeoRouting Europe West ccTLD', 'GeoRouting_For_Domain/GeoRouting_Europe_West_ccTLD_Domain.yaml'),
    GEO_ROUTING_OCEANIA_CCTLD_DOMAIN: accademia('GeoRouting Oceania ccTLD', 'GeoRouting_For_Domain/GeoRouting_Oceania_ccTLD_Domain.yaml'),
    GEO_ROUTING_AFRICA_CENTRAL_GEOIP: accademia('GeoRouting Africa Central GeoIP', 'GeoRouting_For_IP/GeoRouting_Africa_Central_GeoIP.yaml', 'classical'),
    GEO_ROUTING_AFRICA_EAST_GEOIP: accademia('GeoRouting Africa East GeoIP', 'GeoRouting_For_IP/GeoRouting_Africa_East_GeoIP.yaml', 'classical'),
    GEO_ROUTING_AFRICA_NORTH_GEOIP: accademia('GeoRouting Africa North GeoIP', 'GeoRouting_For_IP/GeoRouting_Africa_North_GeoIP.yaml', 'classical'),
    GEO_ROUTING_AFRICA_SOUTH_GEOIP: accademia('GeoRouting Africa South GeoIP', 'GeoRouting_For_IP/GeoRouting_Africa_South_GeoIP.yaml', 'classical'),
    GEO_ROUTING_AFRICA_WEST_GEOIP: accademia('GeoRouting Africa West GeoIP', 'GeoRouting_For_IP/GeoRouting_Africa_West_GeoIP.yaml', 'classical'),
    GEO_ROUTING_AMERICA_NORTH_GEOIP: accademia('GeoRouting America North GeoIP', 'GeoRouting_For_IP/GeoRouting_America_North_GeoIP.yaml', 'classical'),
    GEO_ROUTING_AMERICA_SOUTH_GEOIP: accademia('GeoRouting America South GeoIP', 'GeoRouting_For_IP/GeoRouting_America_South_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ANTARCTICA_GEOIP: accademia('GeoRouting Antarctica GeoIP', 'GeoRouting_For_IP/GeoRouting_Antarctica_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ASIA_CENTRAL_GEOIP: accademia('GeoRouting Asia Central GeoIP', 'GeoRouting_For_IP/GeoRouting_Asia_Central_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ASIA_CHINA_GEOIP: accademia('GeoRouting Asia China GeoIP', 'GeoRouting_For_IP/GeoRouting_Asia_China_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ASIA_EASTSOUTH_GEOIP: accademia('GeoRouting Asia EastSouth GeoIP', 'GeoRouting_For_IP/GeoRouting_Asia_EastSouth_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ASIA_EAST_GEOIP: accademia('GeoRouting Asia East GeoIP', 'GeoRouting_For_IP/GeoRouting_Asia_East_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ASIA_SOUTH_GEOIP: accademia('GeoRouting Asia South GeoIP', 'GeoRouting_For_IP/GeoRouting_Asia_South_GeoIP.yaml', 'classical'),
    GEO_ROUTING_ASIA_WEST_GEOIP: accademia('GeoRouting Asia West GeoIP', 'GeoRouting_For_IP/GeoRouting_Asia_West_GeoIP.yaml', 'classical'),
    GEO_ROUTING_EUROPE_EAST_GEOIP: accademia('GeoRouting Europe East GeoIP', 'GeoRouting_For_IP/GeoRouting_Europe_East_GeoIP.yaml', 'classical'),
    GEO_ROUTING_EUROPE_WEST_GEOIP: accademia('GeoRouting Europe West GeoIP', 'GeoRouting_For_IP/GeoRouting_Europe_West_GeoIP.yaml', 'classical'),
    GEO_ROUTING_OCEANIA_GEOIP: accademia('GeoRouting Oceania GeoIP', 'GeoRouting_For_IP/GeoRouting_Oceania_GeoIP.yaml', 'classical'),
    GEOSITE_CN_DOMAIN: {
        name: 'Geosite CN',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/GeositeCN/GeositeCN_Domain.yaml',
        behavior: 'domain'
    },
    CHINA_DOMAIN: {
        name: 'China Domain',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/China/China_Domain.yaml',
        behavior: 'domain'
    },
    CHINA_MAX_DOMAIN: {
        name: 'China Max',
        clash: 'https://raw.githubusercontent.com/Accademia/Additional_Rule_For_Clash/main/ChinaMax/ChinaMax_Domain.yaml',
        behavior: 'domain'
    }
};

/**
 * 分流规则集 (通过 RULE-SET 引用远程源)
 */
export const RULE_SETS = {
    BASE: [
        `DOMAIN-SUFFIX,google.com,${DEFAULT_SELECT_GROUP}`,
        `DOMAIN-KEYWORD,google,${DEFAULT_SELECT_GROUP}`,
        `DOMAIN-SUFFIX,github.com,${DEFAULT_SELECT_GROUP}`,
        'GEOIP,CN,DIRECT',
        `MATCH,${DEFAULT_SELECT_GROUP}`
    ],
    STD: [
        'RULE-SET,ADS,🎬 视频广告',
        'RULE-SET,AI,🤖 智能 AI',
        'RULE-SET,STREAM,🎥 流媒体',
        'RULE-SET,APPLE,🍎 Apple',
        'RULE-SET,MICROSOFT,Ⓜ️ Microsoft',
        `DOMAIN-SUFFIX,google.com,${DEFAULT_SELECT_GROUP}`,
        `DOMAIN-SUFFIX,github.com,${DEFAULT_SELECT_GROUP}`,
        'GEOIP,CN,DIRECT',
        `MATCH,${DEFAULT_SELECT_GROUP}`
    ],
    FULL: [
        'RULE-SET,ADS,🎬 视频广告',
        'RULE-SET,SOCIAL,📲 Telegram',
        'RULE-SET,AI,🤖 智能 AI',
        'RULE-SET,STREAM,🎥 流媒体',
        'RULE-SET,APPLE,🍎 Apple',
        'RULE-SET,MICROSOFT,Ⓜ️ Microsoft',
        `DOMAIN-SUFFIX,google.com,${DEFAULT_SELECT_GROUP}`,
        `DOMAIN-SUFFIX,github.com,${DEFAULT_SELECT_GROUP}`,
        'GEOIP,CN,DIRECT',
        `MATCH,${DEFAULT_SELECT_GROUP}`
    ],
    RELAY: [
        'RULE-SET,ADS,🎬 视频广告',
        'RULE-SET,AI,🤖 智能 AI',
        'RULE-SET,STREAM,🎥 流媒体',
        'RULE-SET,APPLE,🍎 Apple',
        'RULE-SET,MICROSOFT,Ⓜ️ Microsoft',
        `DOMAIN-SUFFIX,google.com,${DEFAULT_RELAY_GROUP}`,
        `DOMAIN-SUFFIX,github.com,${DEFAULT_RELAY_GROUP}`,
        'GEOIP,CN,DIRECT',
        `MATCH,${DEFAULT_RELAY_GROUP}`
    ],
    MATRIX: [
        'RULE-SET,PRE_REPAIR_EASY_PRIVACY_DIRECT,DIRECT',
        'RULE-SET,PRE_REPAIR_EASY_PRIVACY_PROXY,PROXY',
        'RULE-SET,PRE_REPAIR_EASY_PRIVACY_REJECT,BLOCK',
        'RULE-SET,BLOCK_HTTP_DNS_PLUS,BLOCK',
        'RULE-SET,CHINA_DNS_DOMAIN,BLOCK',
        'RULE-SET,CHINA_DNS_IP,BLOCK',
        'RULE-SET,HIJACKING_PLUS,BLOCK',
        'RULE-SET,GEMINI_DOMAIN,AI',
        'RULE-SET,GROK_DOMAIN,AI',
        'RULE-SET,COPILOT_DOMAIN,AI',
        'RULE-SET,APPLE_AI_DOMAIN,AI',
        'RULE-SET,BM_OPENAI,AI',
        'RULE-SET,BM_CLAUDE,AI',
        'RULE-SET,BM_TELEGRAM,TG',
        'RULE-SET,BM_YOUTUBE,YOUTUBE',
        'RULE-SET,APPLE_NEWS_DOMAIN,PROXY',
        'RULE-SET,SIGNAL_DOMAIN,PROXY',
        'RULE-SET,KWAI_DOMAIN,PROXY',
        'RULE-SET,PORNHUB_DOMAIN,PROXY',
        'RULE-SET,WAYBACK_MACHINE_DOMAIN,PROXY',
        'RULE-SET,WAYBACK_MACHINE_IP,PROXY',
        'RULE-SET,FASTLY_IP,PROXY',
        'RULE-SET,PARSEC_DOMAIN,PROXY',
        'RULE-SET,RUSTDESK_DOMAIN,PROXY',
        'RULE-SET,MAC_APP_UPGRADE_DOMAIN,PROXY',
        'RULE-SET,EMULE_SERVER_IP,PROXY',
        'RULE-SET,GLOBAL_DNS_DOMAIN,PROXY',
        'RULE-SET,GLOBAL_DNS_IP,PROXY',
        'RULE-SET,APPLE_DOMAIN,APPLE',
        'RULE-SET,APPLE_IP,APPLE',
        'RULE-SET,MICROSOFT_APPS_DOMAIN,DIRECT',
        'RULE-SET,ALIPAN_DOMAIN,DIRECT',
        'RULE-SET,BAIDU_NETDISK_DOMAIN,DIRECT',
        'RULE-SET,WEIYUN_DOMAIN,DIRECT',
        'RULE-SET,WEIYUN_IP,DIRECT',
        'RULE-SET,AQARA_CN_DOMAIN,DIRECT',
        'RULE-SET,AQARA_GLOBAL_DOMAIN,PROXY',
        'RULE-SET,AQARA_GLOBAL_IP,PROXY',
        'RULE-SET,UNSUPPORT_VPN_DOMAIN,DIRECT',
        'RULE-SET,BANK_AU_DOMAIN,BANK',
        'RULE-SET,BANK_CA_DOMAIN,BANK',
        'RULE-SET,BANK_DE_DOMAIN,BANK',
        'RULE-SET,BANK_FR_DOMAIN,BANK',
        'RULE-SET,BANK_HK_DOMAIN,BANK',
        'RULE-SET,BANK_JP_DOMAIN,BANK',
        'RULE-SET,BANK_NL_DOMAIN,BANK',
        'RULE-SET,BANK_SG_DOMAIN,BANK',
        'RULE-SET,BANK_UK_DOMAIN,BANK',
        'RULE-SET,BANK_US_DOMAIN,BANK',
        'RULE-SET,PAYPAL,FINANCE',
        'RULE-SET,WISE,FINANCE',
        'RULE-SET,MONZO,FINANCE',
        'RULE-SET,REVOLUT,FINANCE',
        'RULE-SET,HOMEIP_JP,PROXY',
        'RULE-SET,HOMEIP_US,PROXY',
        'RULE-SET,BM_BILIBILI,DIRECT',
        'RULE-SET,BM_TIKTOK,TIKTOK',
        'RULE-SET,FAKE_LOCATION_BILIBILI,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_DOUBAN,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_DOUYIN,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_KUAISHOU,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_TIEBA,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_WEIBO,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_XIGUA,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_XIANYU,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_XIAOHONGSHU,FAKE-LOCATION',
        'RULE-SET,FAKE_LOCATION_ZHIHU,FAKE-LOCATION',
        'RULE-SET,GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN,DIRECT',
        'RULE-SET,GEO_ROUTING_ASIA_CHINA_GEOIP,DIRECT',
        'RULE-SET,GEO_ROUTING_AMERICA_NORTH_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AMERICA_SOUTH_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_EUROPE_WEST_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_EUROPE_EAST_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_OCEANIA_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_ANTARCTICA_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_EAST_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_EASTSOUTH_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_SOUTH_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_CENTRAL_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_WEST_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_NORTH_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_SOUTH_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_WEST_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_EAST_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_CENTRAL_CCTLD_DOMAIN,PROXY',
        'RULE-SET,GEO_ROUTING_AMERICA_NORTH_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_AMERICA_SOUTH_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_EUROPE_WEST_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_EUROPE_EAST_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_OCEANIA_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_ANTARCTICA_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_EAST_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_EASTSOUTH_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_SOUTH_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_CENTRAL_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_ASIA_WEST_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_NORTH_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_SOUTH_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_WEST_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_EAST_GEOIP,PROXY',
        'RULE-SET,GEO_ROUTING_AFRICA_CENTRAL_GEOIP,PROXY',
        'RULE-SET,GEOSITE_CN_DOMAIN,DIRECT',
        'RULE-SET,CHINA_DOMAIN,DIRECT',
        'RULE-SET,CHINA_MAX_DOMAIN,DIRECT',
        'GEOIP,CN,DIRECT',
        `MATCH,${MATRIX_FINAL_GROUP}`
    ]
};

/**
 * 翻译逻辑集
 */

// 转换单行规则到目标格式
export function translateRuleLine(line, format) {
    const parts = line.split(',');
    const type = parts[0];
    const value = parts[1];
    const target = parts[2];
    const extra = parts[3];

    if (type === 'RULE-SET') {
        const source = REMOTE_SOURCES[value];
        if (!source) return null;

        switch (format) {
            case 'clash':
                // 返回中间对象，由生成器处理 rule-providers
                return { type: 'rule-provider', provider: value, target };
            case 'singbox':
            case 'sing-box':
                if (!source.singbox) return null;
                // 返回中间对象，由生成器处理 rule_sets
                return { type: 'rule_set', tag: value, outbound: target };
            case 'surge':
            case 'loon':
                return `RULE-SET,${source.surge || source.clash},${target}`;
            case 'quanx':
                return `filter_remote, ${source.quanx || source.clash}, tag=${source.name}, force-policy=${target}, update-interval=86400`;
            default:
                return null;
        }
    }

    switch (format) {
        case 'singbox':
        case 'sing-box':
            if (type === 'DOMAIN-SUFFIX') return { domain_suffix: [value], outbound: target };
            if (type === 'DOMAIN-KEYWORD') return { domain_keyword: [value], outbound: target };
            if (type === 'DOMAIN') return { domain: [value], outbound: target };
            if (type === 'IP-CIDR') return { ip_cidr: [value], outbound: target };
            if (type === 'GEOIP') return { geoip: [value.toLowerCase()], outbound: target };
            return null;

        case 'surge':
        case 'loon':
            return line;

        case 'quanx':
            let qxType = type;
            if (type === 'DOMAIN-SUFFIX') qxType = 'HOST-SUFFIX';
            if (type === 'DOMAIN-KEYWORD') qxType = 'HOST-KEYWORD';
            if (type === 'DOMAIN') qxType = 'HOST';
            if (type === 'MATCH') return `FINAL, ${value}`;
            return `${qxType}, ${value}, ${target}${extra ? ', ' + extra : ''}`;

        default:
            return line;
    }
}

// 获取全量分流规则文本/对象
export function getBuiltinRules(level, format, options = {}) {
    const levelKey = level.toUpperCase();
    const rawRules = RULE_SETS[levelKey] || RULE_SETS.STD;
    const extraRules = levelKey === 'MATRIX'
        ? normalizeCustomMatrixRules(options.customMatrixRules, options.customMatrixGroups)
        : [];
    return [...extraRules, ...rawRules].map(l => translateRuleLine(l, format)).filter(Boolean);
}

/**
 * 为特定的生成器提取远程源定义
 * @param {string} format 
 * @param {Array} ruleLines (翻译后的规则行)
 */
export function getRemoteProviderDefinitions(format, ruleLines) {
    const providers = {};
    const usedTags = new Set();

    ruleLines.forEach(line => {
        if (format === 'clash' && line.type === 'rule-provider') {
            usedTags.add(line.provider);
        } else if ((format === 'singbox' || format === 'sing-box') && line.type === 'rule_set') {
            usedTags.add(line.tag);
        }
    });

    usedTags.forEach(tag => {
        const source = REMOTE_SOURCES[tag];
        if (!source) return;

        if (format === 'clash') {
            providers[tag] = {
                type: 'http',
                behavior: source.behavior || 'classical',
                url: source.clash,
                path: `./ruleset/${tag}.yaml`,
                interval: 86400
            };
        } else if (format === 'singbox' || format === 'sing-box') {
            if (!source.singbox) return;
            providers[tag] = {
                tag: tag,
                type: 'remote',
                format: String(source.singbox || '').toLowerCase().endsWith('.srs') ? 'binary' : 'source',
                url: source.singbox,
                download_detour: 'DIRECT'
            };
        }
    });

    return providers;
}
