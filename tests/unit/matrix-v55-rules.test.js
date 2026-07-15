import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { generateBuiltinClashConfig } from '../../functions/modules/subscription/builtin-clash-generator.js';

describe('Matrix V5.5 rules', () => {
    it('keeps V5.5 rule providers and injects visual custom rules first', () => {
        const node = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@1.2.3.4:8388#MatrixNode';
        const parsed = yaml.load(generateBuiltinClashConfig(node, {
            ruleLevel: 'matrix',
            customMatrixGroups: [{ name: 'MY-MEDIA', type: 'select' }],
            customMatrixRules: [{ type: 'DOMAIN-SUFFIX', value: 'emby.media', target: 'MY-MEDIA' }]
        }));
        const groups = new Map(parsed['proxy-groups'].map(group => [group.name, group]));

        expect(groups.get('MY-MEDIA')).toBeTruthy();
        expect(parsed.rules[0]).toBe('DOMAIN-SUFFIX,emby.media,MY-MEDIA');
        expect(parsed.rules).toContain('RULE-SET,PRE_REPAIR_EASY_PRIVACY_DIRECT,DIRECT');
        expect(parsed.rules).toContain('RULE-SET,BM_ADVERTISING_LITE,BLOCK');
        expect(parsed.rules).toContain('RULE-SET,BM_XIAOHONGSHU,DIRECT');
        expect(parsed.rules).toContain('RULE-SET,GEO_ROUTING_AFRICA_CENTRAL_GEOIP,PROXY');
        expect(parsed['rule-providers']).toHaveProperty('BANK_AU_DOMAIN');
        expect(parsed['rule-providers']).toHaveProperty('BM_ADVERTISING_LITE');
        expect(parsed['rule-providers']).toHaveProperty('BM_XIAOHONGSHU');
        expect(parsed['rule-providers']).toHaveProperty('GEO_ROUTING_AFRICA_CENTRAL_GEOIP');
    });

    it('omits oversized ad rule providers for all Matrix clients', () => {
        const node = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@1.2.3.4:8388#MatrixNode';
        const parsed = yaml.load(generateBuiltinClashConfig(node, {
            ruleLevel: 'matrix'
        }));

        expect(parsed.rules).not.toContain('RULE-SET,ANTI_AD,BLOCK');
        expect(parsed.rules).not.toContain('RULE-SET,REIJI_ADBLOCK,BLOCK');
        expect(parsed['rule-providers']).not.toHaveProperty('ANTI_AD');
        expect(parsed['rule-providers']).not.toHaveProperty('REIJI_ADBLOCK');
        expect(parsed['rule-providers']).toHaveProperty('BM_ADVERTISING_LITE');
        expect(parsed['rule-providers']).toHaveProperty('PRE_REPAIR_EASY_PRIVACY_REJECT');
    });
});
