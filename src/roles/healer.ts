/**
 * 治疗者角色
 * 负责治疗友方creep，支持战斗和非战斗模式
 */

// 治疗者内存接口
interface HealerMemory extends CreepMemory {
    role: 'healer';
    targetRoom?: string; // 目标房间
    healTargetId?: Id<Creep>; // 治疗目标ID
    followMode?: boolean; // 是否跟随特定目标
    combatMode?: boolean; // 是否在战斗模式
    patrolPath?: RoomPosition[]; // 巡逻路径
    patrolIndex?: number; // 当前巡逻点索引
    lastTargetCheck?: number; // 上次检查目标的时间
}

import { getSpawnAndExtensionEnergy } from "utils/GetEnergy";

let healerRole = {
    /**
     * 创建治疗者
     * @param spawnName spawn名称
     * @param energyLimit 能量限制
     * @param count 创建数量
     * @param body 身体配置
     * @param targetRoom 目标房间
     * @param combatMode 是否为战斗模式
     */
    createBySpawn: function(spawnName: string, energyLimit: number, count: number, body: BodyPartConstant[], targetRoom?: string, combatMode: boolean = false) {
        const base = Game.spawns[spawnName];
        if (!base) {
            console.log("找不到 Spawn: " + spawnName);
            return;
        }

        // 统计当前治疗者数量
        const healers = _.filter(Game.creeps, (creep) => creep.memory.role === 'healer');


        // 如果数量不足
        if (healers.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {
            const newName = 'Healer_' + Game.time;

            console.log(`尝试生成新的治疗者: ${newName}`);

            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: 'healer',
                    room: spawnName,
                    targetRoom: targetRoom || spawnName,
                    working: false,
                    combatMode: combatMode,
                    followMode: false,
                    patrolIndex: 0,
                    lastTargetCheck: Game.time
                }
            });

            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成治疗者。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
            } else {
                console.log(`生成治疗者时发生错误: ${result}`);
            }
        }
    },

    /**
     * 治疗者主要运行逻辑
     * @param creep 治疗者creep
     */
    run: function(creep: Creep) {
        const memory = creep.memory as HealerMemory;

        // 检查生命值，如果过低则撤退
        if (creep.hits < creep.hitsMax * 0.2) {
            creep.say('💔 撤退');
            this.retreatToSafety(creep);
            return;
        }

        // 如果在目标房间或有目标房间，前往目标房间
        if (memory.targetRoom && creep.room.name !== memory.targetRoom) {
            this.moveToTargetRoom(creep, memory.targetRoom);
            return;
        }

        // 定期检查治疗目标
        if (!memory.lastTargetCheck || Game.time - memory.lastTargetCheck > 5) {
            const target = this.findHealTarget(creep);
            if (target) {
                memory.healTargetId = target.id;
                memory.followMode = true;
            } else {
                memory.healTargetId = undefined;
                memory.followMode = false;
            }
            memory.lastTargetCheck = Game.time;
        }

        // 执行治疗逻辑
        if (memory.healTargetId) {
            const target = Game.getObjectById(memory.healTargetId);
            if (target && target.hits < target.hitsMax) {
                this.healTarget(creep, target);
            } else {
                // 目标已满血或不存在，清除目标
                memory.healTargetId = undefined;
                memory.followMode = false;
            }
        }

        // 没有治疗目标时的行为
        if (!memory.healTargetId) {
            if (memory.combatMode) {
                // 战斗模式：跟随攻击者
                this.followAttacker(creep);
            } else {
                // 和平模式：巡逻或回到安全位置
                this.patrolOrReturn(creep);
            }
        }
    },

    /**
     * 移动到目标房间
     * @param creep 治疗者creep
     * @param targetRoomName 目标房间名称
     */
    moveToTargetRoom: function(creep: Creep, targetRoomName: string) {
        const exitDir = creep.room.findExitTo(targetRoomName);
        if (exitDir !== -2) {
            const exit = creep.pos.findClosestByPath(exitDir as FindConstant);
            if (exit) {
                creep.moveTo(exit, { visualizePathStyle: { stroke: '#00ff00' } });
                creep.say('💚 前进');
            }
        }
    },

    /**
     * 寻找治疗目标
     * @param creep 治疗者creep
     * @returns 治疗目标
     */
    findHealTarget: function(creep: Creep): Creep | null {
        // 查找需要治疗的友方creep
        const injuredAllies = creep.room.find(FIND_MY_CREEPS, {
            filter: (c) => c.hits < c.hitsMax && c.id !== creep.id
        });

        if (injuredAllies.length === 0) {
            return null;
        }

        // 按优先级排序治疗目标
        const prioritizedTargets = injuredAllies.sort((a, b) => {
            // 优先治疗重伤单位（生命值百分比低的）
            const healthPercentageA = a.hits / a.hitsMax;
            const healthPercentageB = b.hits / b.hitsMax;

            if (Math.abs(healthPercentageA - healthPercentageB) > 0.1) {
                return healthPercentageA - healthPercentageB;
            }

            // 生命值相近时，优先治疗重要角色
            const getRolePriority = (creep: Creep): number => {
                const role = creep.memory.role;
                if (role && role.includes('attacker')) return 1;
                if (role && role.includes('healer')) return 2;
                if (role && role.includes('claimer')) return 3;
                return 4;
            };

            const priorityA = getRolePriority(a);
            const priorityB = getRolePriority(b);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // 最后考虑距离
            return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
        });

        return prioritizedTargets[0] || null;
    },

    /**
     * 治疗目标
     * @param creep 治疗者creep
     * @param target 治疗目标
     */
    healTarget: function(creep: Creep, target: Creep) {
        const range = creep.pos.getRangeTo(target.pos);

        if (range === 1) {
            // 近战治疗
            const result = creep.heal(target);
            if (result === OK) {
                creep.say('💚 治疗');
            }
        } else if (range <= 3) {
            // 远程治疗
            const result = creep.rangedHeal(target);
            if (result === OK) {
                creep.say('💚 远程治疗');
            }

            // 移动到目标附近
            if (range > 1) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
            }
        } else {
            // 移动到目标
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
        }
    },

    /**
     * 跟随攻击者
     * @param creep 治疗者creep
     */
    followAttacker: function(creep: Creep) {
        // 查找附近的攻击者
        const attackers = creep.room.find(FIND_MY_CREEPS, {
            filter: (c) => c.memory.role && c.memory.role.includes('attacker')
        });

        if (attackers.length > 0) {
            // 选择生命值最低的攻击者跟随
            const targetAttacker = attackers.reduce((weakest, current) => {
                const weakestHealth = weakest.hits / weakest.hitsMax;
                const currentHealth = current.hits / current.hitsMax;
                return currentHealth < weakestHealth ? current : weakest;
            });

            const range = creep.pos.getRangeTo(targetAttacker);
            if (range > 2) {
                creep.moveTo(targetAttacker, { visualizePathStyle: { stroke: '#00ff00' } });
                creep.say('🛡️ 护卫');
            } else {
                creep.say('🛡️ 待命');
            }
        } else {
            // 没有攻击者时进行巡逻
            this.patrolOrReturn(creep);
        }
    },

    /**
     * 巡逻或返回安全位置
     * @param creep 治疗者creep
     */
    patrolOrReturn: function(creep: Creep) {
        const memory = creep.memory as HealerMemory;

        // 如果有spawn，返回spawn附近
        const spawns = creep.room.find(FIND_MY_SPAWNS);
        if (spawns.length > 0) {
            const spawn = spawns[0];
            const range = creep.pos.getRangeTo(spawn);
            if (range > 5) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#00ff00' } });
                creep.say('🏠 返回');
                return;
            }
        }

        // 在spawn附近巡逻
        this.patrol(creep);
    },

    /**
     * 巡逻模式
     * @param creep 治疗者creep
     */
    patrol: function(creep: Creep) {
        const memory = creep.memory as HealerMemory;

        // 初始化巡逻路径
        if (!memory.patrolPath) {
            const spawns = creep.room.find(FIND_MY_SPAWNS);
            const centerPos = spawns.length > 0 ? spawns[0].pos : new RoomPosition(25, 25, creep.room.name);

            memory.patrolPath = [
                new RoomPosition(centerPos.x - 5, centerPos.y - 5, creep.room.name),
                new RoomPosition(centerPos.x + 5, centerPos.y - 5, creep.room.name),
                new RoomPosition(centerPos.x + 5, centerPos.y + 5, creep.room.name),
                new RoomPosition(centerPos.x - 5, centerPos.y + 5, creep.room.name)
            ];
            memory.patrolIndex = 0;
        }

        // 执行巡逻
        const currentTarget = memory.patrolPath[memory.patrolIndex || 0];
        const range = creep.pos.getRangeTo(currentTarget);

        if (range <= 2) {
            // 到达巡逻点，切换到下一个
            memory.patrolIndex = ((memory.patrolIndex || 0) + 1) % memory.patrolPath.length;
        }

        creep.moveTo(currentTarget, { visualizePathStyle: { stroke: '#00ff00' } });
        creep.say('👮 巡逻');
    },

    /**
     * 撤退到安全位置
     * @param creep 受伤的creep
     */
    retreatToSafety: function(creep: Creep) {
        // 寻找最近的spawn或治疗者
        const spawns = creep.room.find(FIND_MY_SPAWNS);
        const healers = creep.room.find(FIND_MY_CREEPS, {
            filter: (c) => c.body.some(part => part.type === HEAL) && c.id !== creep.id
        });

        const retreatTargets: RoomPosition[] = [];

        spawns.forEach(spawn => retreatTargets.push(spawn.pos));
        healers.forEach(healer => retreatTargets.push(healer.pos));

        if (retreatTargets.length > 0) {
            const nearestTarget = creep.pos.findClosestByPath(retreatTargets);
            if (nearestTarget) {
                creep.moveTo(nearestTarget, { visualizePathStyle: { stroke: '#ffff00' } });
                creep.say('🏃 撤退');
            }
        } else {
            // 撤退到房间边缘
            const exits = creep.room.find(FIND_EXIT);
            const nearestExit = creep.pos.findClosestByPath(exits);
            if (nearestExit) {
                creep.moveTo(nearestExit, { visualizePathStyle: { stroke: '#ffff00' } });
            }
        }
    },

    /**
     * 批量治疗（治疗范围内所有友方单位）
     * @param creep 治疗者creep
     */
    massHeal: function(creep: Creep) {
        // 治疗邻近的单位
        const adjacentAllies = creep.room.find(FIND_MY_CREEPS, {
            filter: (c) => creep.pos.getRangeTo(c) <= 1 && c.hits < c.hitsMax
        });

        if (adjacentAllies.length > 0) {
            creep.heal(adjacentAllies[0]);
            creep.say('💚 群体治疗');
        }

        // 远程治疗范围内单位
        const rangedAllies = creep.room.find(FIND_MY_CREEPS, {
            filter: (c) => creep.pos.getRangeTo(c) <= 3 && c.hits < c.hitsMax
        });

        if (rangedAllies.length > 0) {
            creep.rangedHeal(rangedAllies[0]);
        }
    },

    /**
     * 调试函数：显示治疗者状态
     */
    debugHealers: function() {
        console.log('=== 治疗者状态 ===');
        const healers = _.filter(Game.creeps, creep => creep.memory.role && creep.memory.role.includes('healer'));

        console.log(`总治疗者数量: ${healers.length}`);

        healers.forEach(healer => {
            const memory = healer.memory as HealerMemory;
            const healTarget = memory.healTargetId ? Game.getObjectById(memory.healTargetId) : null;

            console.log(`${healer.name}:`);
            console.log(`  - 房间: ${healer.room.name}`);
            console.log(`  - 生命值: ${healer.hits}/${healer.hitsMax} (${((healer.hits/healer.hitsMax)*100).toFixed(1)}%)`);
            console.log(`  - 目标房间: ${memory.targetRoom || '未设置'}`);
            console.log(`  - 战斗模式: ${memory.combatMode ? '是' : '否'}`);
            console.log(`  - 治疗目标: ${healTarget ? healTarget.name : '无'}`);
            console.log(`  - 当前任务: ${healer.say || '无'}`);
        });

        console.log('=== 状态报告结束 ===');
    }
};

export default healerRole;
