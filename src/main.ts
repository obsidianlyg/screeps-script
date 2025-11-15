import { ErrorMapper } from "utils/ErrorMapper";

import harvesterRole from "roles/harvester";

import upgradeRole from "roles/upgrader";

import builderRole from "roles/builder";

import transporterRole from "roles/transporter";

import claimerRole from "roles/claimer";

import minerRole from "roles/miner";

import attackerRole from "roles/attacker";

import healerRole from "roles/healer";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

import { initializeRoomSourcePositions } from "utils/InitRoom";

import {
    CreepRole,
    CreepLevel,
    getBodyByRole,
    createBodyParts,
    getLevelByEnergy,
    canAffordBody,
    adjustBodyToEnergy,
    calculateBodyCost
} from './utils/BodyUtils';

import towerRole from "roles/tower";

import transferOnDeath from "utils/DeathHandler";

import TerminalManager from "utils/TerminalManager";

import FactoryManager from "utils/FactoryManager";

import factoryRole from "roles/factoryRole";

import {
    MAIN_SPAWN_NAME
} from "constant/constants";

import mainRoomRole from 'room/MainRoom';
import w9n8RoomRole from 'room/W9N8Room';
import w9n9RoomRole from 'room/W9N9Room';
import w6n8RoomRole from 'room/W6N8Room';

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    rooms: { [name: string]: RoomMemory };
    containerEnergy?: {
      [containerId: string]: number;
    };
    terminalOrders?: {
      [roomName: string]: Array<{
        resourceType: ResourceConstant;
        amount: number;
        targetRoomName: string;
        priority: number;
      }>;
    };
    tradeHistory?: Array<{
      timestamp: number;
      type: 'send' | 'receive' | 'buy' | 'sell';
      resourceType: ResourceConstant;
      amount: number;
      fromRoom?: string;
      toRoom?: string;
      price?: number;
    }>;
    factoryTasks?: {
      [roomName: string]: Array<{
        resourceType: ResourceConstant;
        amount: number;
        resultResource: ResourceConstant;
        resultAmount: number;
        priority: number;
        isCompression: boolean;
      }>;
    };
    factoryConfig?: {
      [roomName: string]: {
        compressionThreshold?: { [key: string]: number };
        decompressResources?: { [key: string]: number };
      };
    };
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    stuck?: StuckMemory;
    _move?: any;
    assignedSource?: Id<Source> | null;
    targetRepairId?: Id<StructureRoad | StructureWall | StructureContainer | StructureStorage | StructureTerminal>  | null;
    targetContainerId?: Id<StructureContainer | StructureStorage> | null;
    targetConstructionSiteId?: Id<ConstructionSite> | null;
    lastPosition?: {
      pos: RoomPosition;
      time: number;
    } | null;
    containerLastPosition?: {
      pos: RoomPosition;
      time: number;
    } | null;
    // 搬运任务相关
    transportTarget?: Id<AnyStructure> | null;
    isGettingEnergy?: boolean;
    transportWithdrawPosition?: {
      pos: RoomPosition;
      time: number;
    } | null;
    transportTransferPosition?: {
      pos: RoomPosition;
      time: number;
    } | null;
    // 能量源类型缓存
    energySourceType?: 'container' | 'storage' | null;
    // Claimer 相关
    targetRoom?: string;
    [key: string]: any; // 允许动态属性访问
  }

  // 定义 stuck 属性的结构
  interface StuckMemory {
      // 存储 Creep 所在的位置，用于比较
      pos: RoomPosition;
      // 存储 Creep 停留在该位置的时间点（Game.time）
      time: number;
  }

  interface PathFinderOpts {
    // ... 其他属性，如 ignoreCreeps, maxOps, reusePath ...

    // 显式添加 costCallback 属性
    costCallback?: (roomName: string, costMatrix: CostMatrix) => CostMatrix | void;

    // 显式添加 roomCallback 属性
    roomCallback?: ((roomName: string) => CostMatrix | boolean) | undefined;
}

interface CreepParam {
    role: string;
    conf: Record<string, number>;
    count: number;
    room: string;
    spawn: string;
    modeStr?: string;
}

// 定义 RoomPosition 的简化结构，用于安全地存储到 Memory
interface SerializedRoomPosition {
    x: number;
    y: number;
    roomName: string;
}

// 扩展 RoomMemory 接口，添加缓存属性
interface RoomMemory {
    // ... 其他属性 ...
    sourcePositions?: SerializedRoomPosition[]; // 使用我们定义的简化结构
}

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // 初始化Memory结构（仅在第一次tick执行）
  if (Game.time === 1) {
    TerminalManager.initializeMemory();
    // Factory相关Memory会在使用时自动初始化
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // 循环遍历所有房间进行缓存检查和初始化（在每个Tick只运行一次）
  for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      // 仅对有控制器且已控制的房间进行缓存
      if (room.controller && room.controller.my) {
          initializeRoomSourcePositions(room);
      }
  }

  const mainSpawn = MAIN_SPAWN_NAME;
  const mainRoom = 'W8N8';
  mainRoomRole.create()

  const leftRoom = 'W9N8'
  w9n8RoomRole.create()

  const w9n9 = 'W9N9'
  w9n9RoomRole.create();

  const w6n8 = 'W6N8'
  w6n8RoomRole.create();

  // terminal
  if (Game.time === 1469380) {

  }
  // TerminalManager.sendResource('W8N8', 'W1N1', 'Z', 10000);
  if (Game.time === 1469510) {
    TerminalManager.sendResource('W9N8', 'W8N8', 'U', 10000);
  }
  // TerminalManager.sendResource('W9N8', 'W1N1', 'U', 10000);
  // TerminalManager.sendResource('W9N9', 'W8N8', 'H', 10000);

  // 工厂的操作
  factoryRole.createFactoryOperator(mainSpawn, mainRoom);
  factoryRole.GlobalFactoryCommands.battery(mainRoom, true);



  // 执行任务
   for (let name in Game.creeps) {
      let creep = Game.creeps[name];

      // 临近死亡转移能量
      if (transferOnDeath(creep)) {
        continue;
      }

      // factory
      if (creep.memory.role === 'factoryOperator' && creep.room.name === mainRoom) {
        // factoryRole.runFactoryOperator(creep);
        const storageId: Id<StructureStorage> = "68fe5c1af0d4fc0038ec3e98" as Id<StructureStorage>;
        const factoryId: Id<StructureFactory> = "690cbce95329a70039e8b39c" as Id<StructureFactory>;
        transporterRole.moveResourceBetweenTargets(creep, 'energy', storageId, factoryId);
      }

      // link搬运者
      if (creep.memory.role == 'transporterTemp' && creep.memory.room == mainSpawn && creep.memory.transportMode == 'link') {
        const storageId: Id<StructureStorage> = "68fe5c1af0d4fc0038ec3e98" as Id<StructureStorage>;
        const linkId: Id<StructureLink> = "69106153f18fde003eee2eca" as Id<StructureLink>;
        transporterRole.moveResourceBetweenTargets(creep, 'energy', linkId, storageId);
        continue;
      }

      if (creep.memory.role == 'transporterTemp' && creep.memory.room == w6n8 && creep.memory.transportMode == 'link') {
        const storageId: Id<StructureStorage> = "6911fba0f18fde003eee6adc" as Id<StructureStorage>;
        const linkId: Id<StructureLink> = "69134dcd5329a70039e96e30" as Id<StructureLink>;
        transporterRole.moveResourceBetweenTargets(creep, 'energy', linkId, storageId);
        continue;
      }

      // 特殊搬运者
      if (creep.memory.role == 'transporterTemp' && creep.memory.room == mainSpawn) {
        const storageId: Id<StructureStorage> = "68fe5c1af0d4fc0038ec3e98" as Id<StructureStorage>;
        const terminalRealId: Id<StructureTerminal> = "6903c6343efc9f003de679b7" as Id<StructureTerminal>;
        // transporterRole.moveResourceBetweenTargets(creep, "energy", terminalRealId, storageId);
        // transporterRole.moveResourceBetweenTargets(creep, "energy", storageId, terminalRealId);
        // transporterRole.moveResourceBetweenTargets(creep, RESOURCE_ZYNTHIUM, storageId, terminalRealId);
        // transporterRole.moveResourceBetweenTargets(creep, 'Z', terminalRealId, storageId);
        continue;
      }

      if (creep.memory.role == 'transporterTemp' && creep.memory.room == leftRoom) {
        const storageId: Id<StructureStorage> = "6906ed39206701003cd57037" as Id<StructureStorage>;
        const terminalRealId: Id<StructureTerminal> = "690a5d7c5329a70039e88590" as Id<StructureTerminal>;
        // transporterRole.moveResourceBetweenTargets(creep, "energy", terminalRealId, storageId);
        // transporterRole.moveResourceBetweenTargets(creep, "energy", storageId, terminalRealId);
        // transporterRole.moveResourceBetweenTargets(creep, RESOURCE_ZYNTHIUM, storageId, terminalRealId);
        // transporterRole.moveResourceBetweenTargets(creep, 'U', terminalRealId, storageId);
        continue;
      }

      if (creep.memory.role == 'transporterTemp' && creep.memory.room == w9n9) {
        const storageId: Id<StructureStorage> = "690c03cef18fde003eedc4ac" as Id<StructureStorage>;
        const terminalRealId: Id<StructureTerminal> = "690f46cd5329a70039e8e9bd" as Id<StructureTerminal>;
        // transporterRole.moveResourceBetweenTargets(creep, "energy", terminalRealId, storageId);
        // transporterRole.moveResourceBetweenTargets(creep, "energy", storageId, terminalRealId);
        // transporterRole.moveResourceBetweenTargets(creep, RESOURCE_ZYNTHIUM, storageId, terminalRealId);
        // transporterRole.moveResourceBetweenTargets(creep, RESOURCE_ZYNTHIUM, terminalRealId, storageId);
        continue;
      }

      // 志愿者的判断
      if (creep.memory.role.startsWith('builder') && creep.memory.room == w6n8) {
        builderRole.buildInRoom(creep, w6n8);
        continue;
      }

      if (creep.memory.role.startsWith('upgrader') && creep.memory.room == w6n8) {
        upgradeRole.upgradeInRoom(creep, w6n8);
        continue;
      }

      if (creep.memory.role.startsWith('harvester') && creep.memory.room == w6n8) {
        harvesterRole.harvestInRoom(creep, w6n8);
        continue;
      }

      if (creep.memory.role.startsWith('harvester')) {
        harvesterRole.run(creep);
      }

      if (creep.memory.role.startsWith('upgrader')) {
        upgradeRole.run(creep);
      }

      if (creep.memory.role.startsWith('builder')) {
        builderRole.run(creep);
      }

      // 矿工
      if (creep.memory.role.startsWith('miner')) {
        minerRole.run(creep);
      }

      // 搬运
      if (creep.memory.role.startsWith('transporter')) {
        transporterRole.run(creep);
      }

      // 占领
      if (creep.memory.role == 'claimer') {
        claimerRole.run(creep);
      }

      // 攻击者
      if (creep.memory.role.includes('attacker')) {
        attackerRole.run(creep);
      }
      // 治疗者
      if (creep.memory.role.includes('healer')) {
        healerRole.run(creep);
      }
   }

});
