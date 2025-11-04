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
    createBodyParts,
    getLevelByEnergy,
    canAffordBody,
    adjustBodyToEnergy,
    calculateBodyCost
} from '../utils/BodyUtils';

import towerRole from "roles/tower";

const roomName = 'W9N8';
const subRoom = {
  create: function () {
    const room = Game.rooms[roomName];
    const leftRoomSpwan = Game.spawns[roomName];
    // 创建志愿者
    const VBody: BodyPartConstant[] = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    // builderRole.createVolunteerBySpawn(MAIN_SPAWN_NAME, leftRoom, 1000, 2, VBody);
    // upgradeRole.createVolunteerBySpawn(MAIN_SPAWN_NAME, leftRoom, 1000, 2, VBody);

    // const leftRoomLevel = getLevelByRCL(leftRoomBase.controller?.level || 1);

    // body
    const harvestConf = {
      work: 7,
      carry: 4,
      move: 1
    }
    const buildConf = {
      work: 4,
      carry: 4,
      move: 4
    }
    const upConf = {
      work: 7,
      carry: 4,
      move: 4
    }
    const tranConf = {
      carry: 8,
      move: 4
    }
    // creep数量
    const harvestCount = 2;
    const buildCount = 2;
    const upCount = 3;
    const transCount = 2;

    const harvestBody = createBodyParts(harvestConf);
    const buildBody = createBodyParts(buildConf);
    const upBody = createBodyParts(upConf);
    const transBody = createBodyParts(tranConf);
    harvesterRole.createBySpawn(roomName, calculateBodyCost(harvestBody), harvestCount, harvestBody);
    builderRole.createBySpawn(roomName, calculateBodyCost(buildBody), buildCount, harvestCount, buildBody);
    upgradeRole.createBySpawn(roomName, calculateBodyCost(upBody), upCount, harvestCount, upBody);
    transporterRole.createBySpawn(roomName, calculateBodyCost(transBody), transCount, transBody, 'energy')
    towerRole.run(room);
  }
}

export default subRoom;
