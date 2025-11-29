import { ResourceConstant } from 'screeps';

// 实验室配置接口
export interface LabRoomConfig {
    enabled: boolean;
    minLabs: number;
    operatorCount: number;
    enableBasicReactions: boolean;
    enableAdvancedReactions: boolean;
    enablePowerReaction: boolean;
    customReactions?: {
        resourceType: ResourceConstant;
        amount: number;
        priority: number;
    }[];
}

// 默认实验室配置
export const DEFAULT_LAB_CONFIG: LabRoomConfig = {
    enabled: true,
    minLabs: 3,
    operatorCount: 2,
    enableBasicReactions: true,
    enableAdvancedReactions: false,
    enablePowerReaction: false,
    customReactions: []
};

// 房间特定的实验室配置
export const LAB_ROOM_CONFIGS: { [roomName: string]: LabRoomConfig } = {
    'W8N8': {
        enabled: true,
        minLabs: 3,
        operatorCount: 2,
        enableBasicReactions: true,
        enableAdvancedReactions: true,
        enablePowerReaction: true,
        customReactions: [
            { resourceType: 'G' as ResourceConstant, amount: 500, priority: 3 },
            { resourceType: 'OH' as ResourceConstant, amount: 300, priority: 2 }
        ]
    },
    'W9N8': {
        enabled: true,
        minLabs: 3,
        operatorCount: 1,
        enableBasicReactions: true,
        enableAdvancedReactions: false,
        enablePowerReaction: false
    },
    'W9N9': {
        enabled: true,
        minLabs: 3,
        operatorCount: 1,
        enableBasicReactions: true,
        enableAdvancedReactions: false,
        enablePowerReaction: false
    },
    'W6N8': {
        enabled: false, // 暂时禁用
        minLabs: 3,
        operatorCount: 1,
        enableBasicReactions: false,
        enableAdvancedReactions: false,
        enablePowerReaction: false
    }
};

// 获取房间的实验室配置
export function getLabConfig(roomName: string): LabRoomConfig {
    return LAB_ROOM_CONFIGS[roomName] || { ...DEFAULT_LAB_CONFIG };
}

// 检查房间是否启用了实验室系统
export function isLabSystemEnabled(roomName: string): boolean {
    const config = getLabConfig(roomName);
    return config.enabled;
}

// 更新房间配置
export function updateLabConfig(roomName: string, config: Partial<LabRoomConfig>): void {
    LAB_ROOM_CONFIGS[roomName] = {
        ...DEFAULT_LAB_CONFIG,
        ...LAB_ROOM_CONFIGS[roomName],
        ...config
    };
}

// 实验室身体配置
export const LAB_OPERATOR_BODIES = {
    small: { work: 2, carry: 2, move: 2 },      // 600 能量
    medium: { work: 4, carry: 4, move: 4 },     // 1200 能量
    large: { work: 6, carry: 6, move: 4 },      // 1600 能量
    xlarge: { work: 8, carry: 8, move: 6 }      // 2400 能量
};

// 根据房间能量等级获取合适的身体配置
export function getLabOperatorBody(energyAvailable: number): { work: number; carry: number; move: number } {
    if (energyAvailable >= 2400) return LAB_OPERATOR_BODIES.xlarge;
    if (energyAvailable >= 1600) return LAB_OPERATOR_BODIES.large;
    if (energyAvailable >= 1200) return LAB_OPERATOR_BODIES.medium;
    return LAB_OPERATOR_BODIES.small;
}

// 反应优先级配置
export const REACTION_PRIORITIES: { [resourceType: string]: number } = {
    'O': 1,           // 基础氧化剂
    'H': 1,           // 基础氢
    'U': 2,           // 基础铀
    'L': 2,           // 基础镭
    'K': 2,           // 基础钾
    'Z': 2,           // 基础锌
    'G': 3,           // 基础钆
    'OH': 4,          // 氢氧化物
    'UL': 4,          // 铀镭合金
    'UH': 4,          // 氢化铀
    'UO': 4,          // 氧化铀
    'KH': 4,          // 氢化钾
    'KO': 4,          // 氧化钾
    'LH': 4,          // 氢化镭
    'LO': 4,          // 氧化镭
    'ZH': 4,          // 氢化锌
    'ZO': 4,          // 氧化锌
    'GH': 5,          // 氢化钆
    'GO': 5,          // 氧化钆
    'G': 5,           // 钆
    'XUH2O': 6,       // 超级氢氧化物
    'power': 10       // 最高优先级
};

// 获取反应优先级
export function getReactionPriority(resourceType: ResourceConstant): number {
    return REACTION_PRIORITIES[resourceType] || 1;
}

// 实验室清理配置
export const LAB_CLEANUP_CONFIG = {
    enableAutoCleanup: true,
    cleanupInterval: 1000,  // 每1000 tick清理一次
    minimumAmount: 100,     // 少于100数量时进行清理
    keepResources: [        // 这些资源即使少量也不清理
        'power',
        'G',
        'XUH2O'
    ]
};

// 资源阈值配置
export const RESOURCE_THRESHOLDS: { [resourceType: string]: { min: number; max: number; } } = {
    'energy': { min: 10000, max: 100000 },
    'H': { min: 1000, max: 10000 },
    'O': { min: 1000, max: 10000 },
    'U': { min: 500, max: 5000 },
    'L': { min: 500, max: 5000 },
    'K': { min: 500, max: 5000 },
    'Z': { min: 500, max: 5000 },
    'G': { min: 200, max: 2000 },
    'OH': { min: 200, max: 2000 },
    'UL': { min: 100, max: 1000 },
    'UH': { min: 100, max: 1000 },
    'UO': { min: 100, max: 1000 },
    'power': { min: 50, max: 500 }
};

// 检查是否需要生产更多资源
export function shouldProduceMore(resourceType: ResourceConstant, currentAmount: number): boolean {
    const threshold = RESOURCE_THRESHOLDS[resourceType];
    if (!threshold) return false;
    return currentAmount < threshold.min;
}

// 检查是否停止生产（达到上限）
export function shouldStopProduction(resourceType: ResourceConstant, currentAmount: number): boolean {
    const threshold = RESOURCE_THRESHOLDS[resourceType];
    if (!threshold) return false;
    return currentAmount >= threshold.max;
}