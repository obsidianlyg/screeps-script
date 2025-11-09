/**
 * 攻击者角色
 * 负责攻击敌对creep、结构和墙壁
 */

// 攻击者内存接口
interface AttackerMemory extends CreepMemory {
    role: 'attacker';
    targetRoom?: string; // 目标房间
    attackTargetId?: Id<Creep | Structure>; // 攻击目标ID
    patrolMode?: boolean; // 是否在巡逻模式
    lastHealCheck?: number; // 上次检查治疗的时间
}

import { getSpawnAndExtensionEnergy } from "utils/GetEnergy";

let attackerRole = {
    /**
     * 创建攻击者
     * @param spawnName spawn名称
     * @param energyLimit 能量限制
     * @param count 创建数量
     * @param body 身体配置
     * @param targetRoom 目标房间
     */
    createBySpawn: function(spawnName: string, energyLimit: number, count: number, body: BodyPartConstant[], targetRoom?: string) {
        const base = Game.spawns[spawnName];
        if (!base) {
            console.log("找不到 Spawn: " + spawnName);
            return;
        }

        // 统计当前攻击者数量
        const attackers = _.filter(Game.creeps, (creep) => creep.memory.role === 'attacker');

        // 如果数量不足
        if (attackers.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {
            const newName = 'Attacker_' + Game.time;

            console.log(`尝试生成新的攻击者: ${newName}`);

            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: 'attacker',
                    room: spawnName,
                    targetRoom: targetRoom || spawnName,
                    working: false,
                    patrolMode: true,
                    lastHealCheck: Game.time
                }
            });

            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成攻击者。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
            } else {
                console.log(`生成攻击者时发生错误: ${result}`);
            }
        }
    },

    /**
     * 攻击者主要运行逻辑
     * @param creep 攻击者creep
     */
    run: function(creep: Creep) {
        const memory = creep.memory as AttackerMemory;

        // 检查生命值，如果过低则撤退
        if (creep.hits < creep.hitsMax * 0.3) {
            creep.say('💔 撤退');
            this.retreatToSafety(creep);
            return;
        }

        // 如果在目标房间或有目标房间，前往目标房间
        if (memory.targetRoom && creep.room.name !== memory.targetRoom) {
            this.moveToTargetRoom(creep, memory.targetRoom);
            return;
        }

        // 寻找并攻击目标
        const target = this.findAttackTarget(creep);
        if (target) {
            memory.attackTargetId = target.id;
            this.attackTarget(creep, target);
        } else {
            // 没有目标时进行巡逻
            if (memory.patrolMode) {
                this.patrol(creep);
            } else {
                creep.say('🎯 无目标');
            }
        }

        // 定期检查是否需要治疗
        if (!memory.lastHealCheck || Game.time - memory.lastHealCheck > 10) {
            this.checkForHealing(creep);
            memory.lastHealCheck = Game.time;
        }
    },

    /**
     * 移动到目标房间
     * @param creep 攻击者creep
     * @param targetRoomName 目标房间名称
     */
    moveToTargetRoom: function(creep: Creep, targetRoomName: string) {
        const exitDir = creep.room.findExitTo(targetRoomName);
        if (exitDir !== -2) {
            const exit = creep.pos.findClosestByPath(exitDir as FindConstant);
            if (exit) {
                creep.moveTo(exit, { visualizePathStyle: { stroke: '#ff0000' } });
                creep.say('⚔️ 进攻');
            }
        }
    },

    /**
     * 寻找攻击目标
     * @param creep 攻击者creep
     * @returns 攻击目标
     */
    findAttackTarget: function(creep: Creep): Creep | Structure | null {
        // 优先攻击敌对creep
        const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS, {
            filter: (c) => !c.my && c.owner.username !== 'Source Keeper'
        });

        if (hostileCreeps.length > 0) {
            // 优先攻击治疗者或远程攻击单位
            const prioritizedTargets = hostileCreeps.filter(c =>
                c.body.some(part => part.type === HEAL) ||
                c.body.some(part => part.type === RANGED_ATTACK)
            );

            if (prioritizedTargets.length > 0) {
                return creep.pos.findClosestByPath(prioritizedTargets);
            }

            return creep.pos.findClosestByPath(hostileCreeps);
        }

        // 攻击敌对结构
        const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: (s) => s.structureType !== STRUCTURE_CONTROLLER && s.structureType !== STRUCTURE_RAMPART
        });

        if (hostileStructures.length > 0) {
            // 优先攻击重要结构
            const priorityStructures = hostileStructures.filter(s =>
                s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_TOWER ||
                s.structureType === STRUCTURE_EXTENSION ||
                s.structureType === STRUCTURE_STORAGE
            );

            if (priorityStructures.length > 0) {
                return creep.pos.findClosestByPath(priorityStructures);
            }

            return creep.pos.findClosestByPath(hostileStructures);
        }

        // 如果没有敌对目标，可以攻击墙壁（用于破路）
        const walls = creep.room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_WALL
        });

        if (walls.length > 0) {
            return creep.pos.findClosestByPath(walls);
        }

        return null;
    },

    /**
     * 攻击目标
     * @param creep 攻击者creep
     * @param target 攻击目标
     */
    attackTarget: function(creep: Creep, target: Creep | Structure) {
        const range = creep.pos.getRangeTo(target.pos);

        if (range <= 1) {
            // 近战攻击
            const result = creep.attack(target);
            if (result === OK) {
                creep.say('⚔️ 攻击');
            }
        } else if (range <= 3) {
            // 远程攻击（如果有RANGED_ATTACK部件）
            if (creep.body.some(part => part.type === RANGED_ATTACK)) {
                const result = creep.rangedAttack(target);
                if (result === OK) {
                    creep.say('🏹 远程');
                }
            }

            // 移动到目标
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
        } else {
            // 移动到目标
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
        }
    },

    /**
     * 巡逻模式
     * @param creep 攻击者creep
     */
    patrol: function(creep: Creep) {
        // 简单的巡逻逻辑：在房间内随机移动
        const targets = [
            new RoomPosition(10, 10, creep.room.name),
            new RoomPosition(40, 10, creep.room.name),
            new RoomPosition(40, 40, creep.room.name),
            new RoomPosition(10, 40, creep.room.name),
            new RoomPosition(25, 25, creep.room.name)
        ];

        const currentTarget = targets[Game.time % targets.length];
        const range = creep.pos.getRangeTo(currentTarget);

        if (range > 3) {
            creep.moveTo(currentTarget, { visualizePathStyle: { stroke: '#ffaa00' } });
        }

        creep.say('👮 巡逻');
    },

    /**
     * 撤退到安全位置
     * @param creep 受伤的creep
     */
    retreatToSafety: function(creep: Creep) {
        // 寻找最近的友方creep或_spawn
        const allies = creep.room.find(FIND_MY_CREEPS);
        const spawns = creep.room.find(FIND_MY_SPAWNS);

        const retreatTargets: RoomPosition[] = [];

        // 添加友方creep位置
        allies.forEach(ally => {
            if (ally.id !== creep.id && ally.body.some(part => part.type === HEAL)) {
                retreatTargets.push(ally.pos);
            }
        });

        // 添加spawn位置
        spawns.forEach(spawn => {
            retreatTargets.push(spawn.pos);
        });

        if (retreatTargets.length > 0) {
            const nearestTarget = creep.pos.findClosestByPath(retreatTargets);
            if (nearestTarget) {
                creep.moveTo(nearestTarget, { visualizePathStyle: { stroke: '#00ff00' } });
            }
        } else {
            // 撤退到房间边缘
            const exits = creep.room.find(FIND_EXIT);
            const nearestExit = creep.pos.findClosestByPath(exits);
            if (nearestExit) {
                creep.moveTo(nearestExit, { visualizePathStyle: { stroke: '#00ff00' } });
            }
        }
    },

    /**
     * 检查是否需要治疗
     * @param creep 攻击者creep
     */
    checkForHealing: function(creep: Creep) {
        // 寻找附近的治疗者
        const healers = creep.room.find(FIND_MY_CREEPS, {
            filter: (c) => c.body.some(part => part.type === HEAL) && c.id !== creep.id
        });

        if (healers.length > 0 && creep.hits < creep.hitsMax) {
            const nearestHealer = creep.pos.findClosestByPath(healers);
            if (nearestHealer && creep.pos.getRangeTo(nearestHealer) > 1) {
                // 移动到治疗者附近
                creep.moveTo(nearestHealer, { visualizePathStyle: { stroke: '#00ff00' } });
                creep.say('💚 需治疗');
            }
        }
    },

    /**
     * 调试函数：显示攻击者状态
     */
    debugAttackers: function() {
        console.log('=== 攻击者状态 ===');
        const attackers = _.filter(Game.creeps, creep => creep.memory.role && creep.memory.role.includes('attacker'));

        console.log(`总攻击者数量: ${attackers.length}`);

        attackers.forEach(attacker => {
            const memory = attacker.memory as AttackerMemory;
            console.log(`${attacker.name}:`);
            console.log(`  - 房间: ${attacker.room.name}`);
            console.log(`  - 生命值: ${attacker.hits}/${attacker.hitsMax} (${((attacker.hits/attacker.hitsMax)*100).toFixed(1)}%)`);
            console.log(`  - 目标房间: ${memory.targetRoom || '未设置'}`);
            console.log(`  - 巡逻模式: ${memory.patrolMode ? '是' : '否'}`);
            console.log(`  - 当前任务: ${attacker.say || '无'}`);
        });

        console.log('=== 状态报告结束 ===');
    }
};

export default attackerRole;
