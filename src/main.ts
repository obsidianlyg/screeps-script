import { ErrorMapper } from "utils/ErrorMapper";

import harvesterRole from "roles/harvester";

import upgradeRole from "roles/upgrader";

import builderRole from "roles/builder";

import transporterRole from "roles/transporter";

import claimerRole from "roles/claimer";

import minerRole from "roles/miner";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

import {
    CreepRole,
    CreepLevel,
    getBodyByRole,
    getLevelByRCL,
    getLevelByEnergy,
    canAffordBody,
    adjustBodyToEnergy,
    calculateBodyCost
} from './utils/BodyUtils';

import towerRole from "roles/tower";

import {
    MAIN_SPAWN_NAME
} from "constant/constants";

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
    containerEnergy?: {
      [containerId: string]: number;
    };
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    stuck?: StuckMemory;
    _move?: any;
    assignedSource?: Id<Source> | null;
    targetRepairId?: Id<StructureRoad | StructureWall> | null;
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
  // console.log(`Current game tick is ${Game.time}`);
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  const base = Game.spawns[MAIN_SPAWN_NAME];

  // 创建

    // 巨型采集者
  harvesterRole.createBig();
  upgradeRole.createBig();
  builderRole.createBig();

  // 基础搬运工
  // harvesterRole.create();
  // upgradeRole.create();
  // builderRole.create();
  transporterRole.create();

  // Claimer 创建（需要指定目标房间）
  // claimerRole.create('W9N8');

  // tower 执行
  towerRole.run(base.room);

  // 主房间加入矿工， 这个矿工移到矿区要在它脚底下放一个容器
  const mainRoom = MAIN_SPAWN_NAME;
  const mainRoomBase = Game.rooms[mainRoom];
  const mainRoomSpwan = Game.spawns[mainRoom];
  const minerBody: BodyPartConstant[] = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
  minerRole.createBySpawn(mainRoom, 1000, 1, minerBody);



  // 小基地的特殊配置
  const leftRoom = 'W9N8'
  const leftRoomBase = Game.rooms[leftRoom];
  const leftRoomSpwan = Game.spawns[leftRoom];
   // 创建志愿者
   const VBody: BodyPartConstant[] = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
  // builderRole.createVolunteerBySpawn(MAIN_SPAWN_NAME, leftRoom, 1000, 2, VBody);
  // upgradeRole.createVolunteerBySpawn(MAIN_SPAWN_NAME, leftRoom, 1000, 2, VBody);

  const leftRoomLevel = getLevelByRCL(leftRoomBase.controller?.level || 1);
  // const leftRoomLevel = 3;
  const leftRoomBodyHarvest = getBodyByRole(CreepRole.HARVESTER, leftRoomLevel)
  const leftRoomBodyBuild = getBodyByRole(CreepRole.BUILDER, leftRoomLevel)
  const leftRoomBodyUpgrade = getBodyByRole(CreepRole.UPGRADER, leftRoomLevel)
  const leftRoomBodyTranspost = getBodyByRole(CreepRole.TRANSPORTER, leftRoomLevel);
  harvesterRole.createBySpawn(leftRoom, calculateBodyCost(leftRoomBodyHarvest), 4, leftRoomBodyHarvest);
  builderRole.createBySpawn(leftRoom, calculateBodyCost(leftRoomBodyBuild), 2, 1, leftRoomBodyBuild);
  upgradeRole.createBySpawn(leftRoom, calculateBodyCost(leftRoomBodyUpgrade), 2, 1, leftRoomBodyUpgrade);
  transporterRole.createBySpawn(leftRoom, calculateBodyCost(leftRoomBodyTranspost), 1, leftRoomBodyTranspost)
  // tower by leftRoom
  towerRole.run(leftRoomBase);

  // 执行任务
   for (let name in Game.creeps) {
      let creep = Game.creeps[name];
      if (creep.memory.role == 'harvester' || creep.memory.role == 'big_harvester'
        || creep.memory.role == 'harvester' + leftRoom
      ) {
        harvesterRole.run(creep);
      }

      if (creep.memory.role == 'upgrader' || creep.memory.role == 'big_upgrader'
        || creep.memory.role == 'upgrader' + leftRoom
      ) {
        upgradeRole.run(creep);
      }

      if (creep.memory.role == 'builder' || creep.memory.role == 'big_builder'
        || creep.memory.role == 'builder' + leftRoom
      ) {
        builderRole.run(creep);
      }

      // 矿工
      if (creep.memory.role == 'miner' + mainRoom) {
        minerRole.run(creep);
      }

      // 搬运
      if (creep.memory.role == 'transporter' || creep.memory.role == 'transporter' + leftRoom) {
        transporterRole.run(creep);
      }

      // 志愿者的判断
      if (creep.memory.role == 'builder' + MAIN_SPAWN_NAME && creep.memory.room == leftRoom) {
        builderRole.buildInRoom(creep, leftRoom);
      }

      if (creep.memory.role == 'upgrader' + MAIN_SPAWN_NAME && creep.memory.room == leftRoom) {
        upgradeRole.upgradeInRoom(creep, leftRoom);
      }

      // 占领
      if (creep.memory.role == 'claimer') {
        claimerRole.run(creep);
      }
   }

});
