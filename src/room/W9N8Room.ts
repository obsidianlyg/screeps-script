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
    const harvestBody = createBodyParts(harvestConf);
    const buildBody = createBodyParts(buildConf);
    const upBody = createBodyParts(upConf);
    const transBody = createBodyParts(tranConf);
    harvesterRole.createBySpawn(roomName, calculateBodyCost(harvestBody), 2, harvestBody);
    builderRole.createBySpawn(roomName, calculateBodyCost(buildBody), 0, 1, buildBody);
    upgradeRole.createBySpawn(roomName, calculateBodyCost(upBody), 3, 1, upBody);
    transporterRole.createBySpawn(roomName, calculateBodyCost(transBody), 2, transBody, 'energy')
    towerRole.run(room);
  }
}

export default subRoom;
