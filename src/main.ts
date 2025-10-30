import { ErrorMapper } from "utils/ErrorMapper";

import havestRole from "roles/harvester";

import upgradeRole from "roles/upgrader";

import builderRole from "roles/builder";

import transporterRole from "roles/transporter";

import claimerRole from "roles/claimer";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

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
  havestRole.createBig();
  upgradeRole.createBig();
  builderRole.createBig();

  // 基础搬运工
  // havestRole.create();
  // upgradeRole.create();
  // builderRole.create();
  transporterRole.create();

  // Claimer 创建（需要指定目标房间）
  // claimerRole.create('W9N8');

  // tower 执行
  towerRole.run(base.room);

  const leftRoom = 'W9N8'
  builderRole.createBySpawn(leftRoom, 200, 2, 0);

  // 执行任务
   for (let name in Game.creeps) {
      let creep = Game.creeps[name];
      if (creep.memory.role == 'harvester' || creep.memory.role == 'big_harvester') {
        havestRole.run(creep);
      }

      if (creep.memory.role == 'upgrader' || creep.memory.role == 'big_upgrader') {
        // upgradeRole.run(creep);
        upgradeRole.upgradeInRoom(creep, "W9N8")
      }

      if (creep.memory.role == 'builder' || creep.memory.role == 'big_builder') {
        // builderRole.run(creep);
        builderRole.buildInRoom(creep, "W9N8");
      }

      if (creep.memory.role == 'builder' + leftRoom) {
        builderRole.buildInRoom(creep, "W9N8");
      }

      if (creep.memory.role == 'transporter') {
        transporterRole.run(creep);
      }

      if (creep.memory.role == 'claimer') {
        claimerRole.run(creep);
      }
   }

});
