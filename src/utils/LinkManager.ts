/**
 * Link管理工具类
 * 提供Link能量传输、存取、查找等功能
 */

// Link传输配置接口
interface LinkTransferConfig {
    sourceLinkId: Id<StructureLink>;
    targetLinkId: Id<StructureLink>;
    resourceType?: ResourceConstant;
    amount?: number;
}

// Link状态接口
interface LinkStatus {
    id: Id<StructureLink>;
    pos: RoomPosition;
    energy: number;
    capacity: number;
    cooldown: number;
    percentage: number;
}

const LinkManager = {
    /**
     * 1. 指定Link传输能量给另一个Link
     * @param sourceLinkId 源Link ID
     * @param targetLinkId 目标Link ID
     * @param amount 传输数量，默认全部
     * @param resourceType 资源类型，默认能量
     * @returns 传输结果码
     */
    transferEnergyToLink(
        sourceLinkId: Id<StructureLink>,
        targetLinkId: Id<StructureLink>,
        amount?: number,
        resourceType: ResourceConstant = RESOURCE_ENERGY
    ): ScreepsReturnCode {
        const sourceLink = Game.getObjectById(sourceLinkId);
        const targetLink = Game.getObjectById(targetLinkId);

        if (!sourceLink) {
            console.log(`找不到源Link: ${sourceLinkId}`);
            return ERR_INVALID_TARGET;
        }

        if (!targetLink) {
            console.log(`找不到目标Link: ${targetLinkId}`);
            return ERR_INVALID_TARGET;
        }

        // 检查源Link是否在冷却中
        if (sourceLink.cooldown > 0) {
            return ERR_TIRED;
        }

        // 检查源Link是否有足够的资源
        const availableAmount = sourceLink.store.getUsedCapacity(resourceType);
        const transferAmount = amount ? Math.min(amount, availableAmount as number) : availableAmount;

        if (transferAmount != null && transferAmount <= 0) {
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 执行传输
        const result = sourceLink.transferEnergy(targetLink, transferAmount as number);

        if (result === OK) {
            console.log(`Link传输成功: ${transferAmount} ${resourceType} 从 ${sourceLinkId.slice(-4)} 到 ${targetLinkId.slice(-4)}`);
        } else {
            console.log(`Link传输失败: ${result} 从 ${sourceLinkId.slice(-4)} 到 ${targetLinkId.slice(-4)}`);
        }

        return result;
    },

    /**
     * 2. 查找Link并将能量提取出来
     * @param room 目标房间
     * @param creep 执行提取的creep
     * @param targetLinkId 可选：指定要提取的Link ID
     * @param amount 提取数量，默认为creep的空余容量
     * @param resourceType 资源类型，默认能量
     * @returns 是否成功执行提取操作
     */
    withdrawEnergyFromLink(
        room: Room,
        creep: Creep,
        targetLinkId?: Id<StructureLink>,
        amount?: number,
        resourceType: ResourceConstant = RESOURCE_ENERGY
    ): boolean {
        let targetLink: StructureLink | null = null;

        if (targetLinkId) {
            // 使用指定的Link
            targetLink = Game.getObjectById(targetLinkId);
        } else {
            // 查找有能量的Link
            const linksWithEnergy = room.find(FIND_STRUCTURES, {
                filter: (structure): structure is StructureLink => {
                    return structure.structureType === STRUCTURE_LINK &&
                           structure.store.getUsedCapacity(resourceType) as number > 0;
                }
            }) as StructureLink[];

            if (linksWithEnergy.length === 0) {
                creep.say('❌ 无Link能量');
                return false;
            }

            // 选择最近的Link
            targetLink = creep.pos.findClosestByPath(linksWithEnergy);
        }

        if (!targetLink) {
            creep.say('❌ 无有效Link');
            return false;
        }

        // 计算要提取的数量
        const withdrawAmount = amount || Math.min(
            creep.store.getFreeCapacity(resourceType),
            targetLink.store.getUsedCapacity(resourceType) as number
        );

        if (withdrawAmount <= 0) {
            creep.say('❌ 容量不足');
            return false;
        }

        // 执行提取
        const result = creep.withdraw(targetLink, resourceType, withdrawAmount);

        if (result === OK) {
            creep.say(`📤 ${withdrawAmount}`);
            console.log(`${creep.name} 从Link ${targetLink.id.slice(-4)} 提取 ${withdrawAmount} ${resourceType}`);
            return true;
        } else if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(targetLink, {
                visualizePathStyle: { stroke: '#ffff00' },
                range: 1
            });
            creep.say('🚶 移动中');
            return true;
        } else {
            console.log(`${creep.name} 从Link提取失败: ${result}`);
            creep.say('❌ 提取失败');
            return false;
        }
    },

    /**
     * 3. 查找Link并将能量放入其中
     * @param room 目标房间
     * @param creep 执行存入的creep
     * @param targetLinkId 可选：指定要存入的Link ID
     * @param amount 存入数量，默认为creep携带的资源数量
     * @param resourceType 资源类型，默认能量
     * @returns 是否成功执行存入操作
     */
    depositEnergyToLink(
        room: Room,
        creep: Creep,
        targetLinkId?: Id<StructureLink>,
        amount?: number,
        resourceType: ResourceConstant = RESOURCE_ENERGY
    ): boolean {
        let targetLink: StructureLink | null = null;

        if (targetLinkId) {
            // 使用指定的Link
            targetLink = Game.getObjectById(targetLinkId);
        } else {
            // 查找有空位的Link
            const linksWithSpace = room.find(FIND_STRUCTURES, {
                filter: (structure): structure is StructureLink => {
                    return structure.structureType === STRUCTURE_LINK &&
                           structure.store.getFreeCapacity(resourceType) as number > 0;
                }
            }) as StructureLink[];

            if (linksWithSpace.length === 0) {
                creep.say('❌ Link已满');
                return false;
            }

            // 选择最近的Link
            targetLink = creep.pos.findClosestByPath(linksWithSpace);
        }

        if (!targetLink) {
            creep.say('❌ 无有效Link');
            return false;
        }

        // 检查creep是否有资源
        const carriedAmount = creep.store.getUsedCapacity(resourceType);
        if (carriedAmount === 0) {
            creep.say('❌ 无资源');
            return false;
        }

        // 计算要存入的数量
        const depositAmount = amount || Math.min(
            carriedAmount,
            targetLink.store.getFreeCapacity(resourceType) as number
        );

        if (depositAmount <= 0) {
            creep.say('❌ Link已满');
            return false;
        }

        // 执行存入
        const result = creep.transfer(targetLink, resourceType, depositAmount);

        if (result === OK) {
            creep.say(`📥 ${depositAmount}`);
            console.log(`${creep.name} 向Link ${targetLink.id.slice(-4)} 存入 ${depositAmount} ${resourceType}`);
            return true;
        } else if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(targetLink, {
                visualizePathStyle: { stroke: '#00ffff' },
                range: 1
            });
            creep.say('🚶 移动中');
            return true;
        } else {
            console.log(`${creep.name} 向Link存入失败: ${result}`);
            creep.say('❌ 存入失败');
            return false;
        }
    },

    /**
     * 4. 查找指定范围内是否有Link，找到并放入能量，没有找到返回false不做处理
     * @param creep 执行操作的creep
     * @param range 搜索范围，默认为1
     * @param amount 存入数量，默认为creep携带的资源数量
     * @param resourceType 资源类型，默认能量
     * @returns 是否找到Link并执行了操作
     */
    depositToNearbyLink(
        creep: Creep,
        range: number = 1,
        amount?: number,
        resourceType: ResourceConstant = RESOURCE_ENERGY
    ): boolean {
        // 检查creep是否有资源
        const carriedAmount = creep.store.getUsedCapacity(resourceType);
        if (carriedAmount === 0) {
            return false;
        }

        // 查找指定范围内的Link
        const nearbyLinks = creep.room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureLink => {
                return structure.structureType === STRUCTURE_LINK &&
                       creep.pos.getRangeTo(structure.pos) <= range &&
                       structure.store.getFreeCapacity(resourceType) as number > 0;
            }
        }) as StructureLink[];

        if (nearbyLinks.length === 0) {
            return false; // 范围内没有Link或Link已满
        }

        // 选择最近的Link
        const targetLink = nearbyLinks[0];
        const depositAmount = amount || Math.min(
            carriedAmount,
            targetLink.store.getFreeCapacity(resourceType) as number
        );

        if (depositAmount <= 0) {
            return false;
        }

        // 执行存入
        const result = creep.transfer(targetLink, resourceType, depositAmount);

        if (result === OK) {
            creep.say(`📥 ${depositAmount}`);
            return true;
        } else {
            console.log(`${creep.name} 向附近Link存入失败: ${result}`);
            return false;
        }
    },

    /**
     * 查找房间内所有的Link并返回状态信息
     * @param room 目标房间
     * @returns Link状态数组
     */
    getAllLinksStatus(room: Room): LinkStatus[] {
        const links = room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureLink => {
                return structure.structureType === STRUCTURE_LINK;
            }
        }) as StructureLink[];

        return links.map(link => ({
            id: link.id,
            pos: link.pos,
            energy: link.store.getUsedCapacity(RESOURCE_ENERGY),
            capacity: link.store.getCapacity(RESOURCE_ENERGY),
            cooldown: link.cooldown,
            percentage: link.store.getCapacity(RESOURCE_ENERGY) > 0
                ? (link.store.getUsedCapacity(RESOURCE_ENERGY) / link.store.getCapacity(RESOURCE_ENERGY)) * 100
                : 0
        }));
    },

    /**
     * 查找最佳的能量源Link（能量最多的）
     * @param room 目标房间
     * @param excludeLinkId 排除的Link ID
     * @returns 最佳能量源Link或null
     */
    findBestSourceLink(room: Room, excludeLinkId?: Id<StructureLink>): StructureLink | null {
        const links = room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureLink => {
                return structure.structureType === STRUCTURE_LINK &&
                       structure.store.getUsedCapacity(RESOURCE_ENERGY) > 100 && // 至少有100能量
                       structure.id !== excludeLinkId;
            }
        }) as StructureLink[];

        if (links.length === 0) {
            return null;
        }

        // 返回能量最多的Link
        return links.reduce((best, current) =>
            current.store.getUsedCapacity(RESOURCE_ENERGY) > best.store.getUsedCapacity(RESOURCE_ENERGY)
                ? current : best
        );
    },

    /**
     * 查找最佳的能量接收Link（能量最少的）
     * @param room 目标房间
     * @param excludeLinkId 排除的Link ID
     * @returns 最佳接收Link或null
     */
    findBestReceiverLink(room: Room, excludeLinkId?: Id<StructureLink>): StructureLink | null {
        const links = room.find(FIND_STRUCTURES, {
            filter: (structure): structure is StructureLink => {
                return structure.structureType === STRUCTURE_LINK &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 100 && // 至少有100空位
                       structure.id !== excludeLinkId;
            }
        }) as StructureLink[];

        if (links.length === 0) {
            return null;
        }

        // 返回能量最少的Link
        return links.reduce((best, current) =>
            current.store.getUsedCapacity(RESOURCE_ENERGY) < best.store.getUsedCapacity(RESOURCE_ENERGY)
                ? current : best
        );
    },

    /**
     * 自动能量均衡：将能量从多的Link传输到少的Link
     * @param room 目标房间
     * @param threshold 传输阈值，默认70%
     * @returns 是否执行了传输操作
     */
    autoBalanceLinks(room: Room, threshold: number = 70): boolean {
        const links = this.getAllLinksStatus(room);

        if (links.length < 2) {
            return false; // 需要至少2个Link才能均衡
        }

        // 找到能量最多的Link和能量最少的Link
        const sortedLinks = [...links].sort((a, b) => b.energy - a.energy);
        const richestLink = Game.getObjectById(sortedLinks[0].id);
        const poorestLink = Game.getObjectById(sortedLinks[sortedLinks.length - 1].id);

        if (!richestLink || !poorestLink) {
            return false;
        }

        // 检查是否需要传输
        const richestPercentage = (richestLink.store.getUsedCapacity(RESOURCE_ENERGY) / richestLink.store.getCapacity(RESOURCE_ENERGY)) * 100;
        const poorestPercentage = (poorestLink.store.getUsedCapacity(RESOURCE_ENERGY) / poorestLink.store.getCapacity(RESOURCE_ENERGY)) * 100;

        if (richestPercentage > threshold && poorestPercentage < threshold - 20) {
            // 计算传输量（传输富余能量的一半）
            const surplus = richestLink.store.getUsedCapacity(RESOURCE_ENERGY) - (richestLink.store.getCapacity(RESOURCE_ENERGY) * threshold / 100);
            const transferAmount = Math.floor(surplus / 2);

            if (transferAmount > 0) {
                const result = this.transferEnergyToLink(richestLink.id, poorestLink.id, transferAmount);
                return result === OK;
            }
        }

        return false;
    },

    /**
     * 调试函数：显示房间内所有Link的状态
     * @param room 目标房间
     */
    debugLinksStatus(room: Room): void {
        console.log(`=== 房间 ${room.name} Link状态 ===`);

        const links = this.getAllLinksStatus(room);

        if (links.length === 0) {
            console.log('房间内没有Link');
            console.log('=== 状态报告结束 ===');
            return;
        }

        console.log(`总Link数量: ${links.length}`);

        links.forEach((link, index) => {
            console.log(`${index + 1}. Link ${link.id.slice(-4)}:`);
            console.log(`   - 位置: (${link.pos.x}, ${link.pos.y})`);
            console.log(`   - 能量: ${link.energy}/${link.capacity} (${link.percentage.toFixed(1)}%)`);
            console.log(`   - 冷却: ${link.cooldown} tick`);
            console.log(`   - 状态: ${link.cooldown > 0 ? '冷却中' : link.energy > 0 ? '可用' : '空'}`);
        });

        // 显示均衡建议
        if (links.length >= 2) {
            const sortedLinks = [...links].sort((a, b) => b.energy - a.energy);
            const richest = sortedLinks[0];
            const poorest = sortedLinks[sortedLinks.length - 1];

            if (richest.percentage > 70 && poorest.percentage < 50) {
                console.log('\n💡 建议: 可以进行Link能量均衡');
                console.log(`   从 Link ${richest.id.slice(-4)} (${richest.percentage.toFixed(1)}%)`);
                console.log(`   传输到 Link ${poorest.id.slice(-4)} (${poorest.percentage.toFixed(1)}%)`);
            }
        }

        console.log('=== 状态报告结束 ===');
    }
};

export default LinkManager;
