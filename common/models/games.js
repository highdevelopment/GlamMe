'use strict';

var Common = require('./common.js');
var request = require('async-request');

module.exports = function(Games) {

  Games.disableRemoteMethodByName("upsert");
  Games.disableRemoteMethodByName("find");
  Games.disableRemoteMethodByName("replaceOrCreate");
  Games.disableRemoteMethodByName("create");

  Games.disableRemoteMethodByName("prototype.updateAttributes");
  Games.disableRemoteMethodByName("findById");
  Games.disableRemoteMethodByName("exists");
  Games.disableRemoteMethodByName("replaceById");
  Games.disableRemoteMethodByName("deleteById");

  Games.disableRemoteMethodByName("createChangeStream");

  Games.disableRemoteMethodByName("count");
  Games.disableRemoteMethodByName("findOne");

  Games.disableRemoteMethodByName("update");
  Games.disableRemoteMethodByName("upsertWithWhere");

  // register game
  Games.registerGame = async(roomId, course_name, game_mode, subCourse1, subCourse2, title, users, userNames, player_num, player_num_login, game_context, game_holenum, option, practice_time) => {
    var Room = Games.app.models.Room;
    var GameLogs = Games.app.models.GameLogs;

    try {
      const roomObj = await Room.findById(roomId);
      if (!roomObj) {
        return Promise.resolve(Common.makeResult(false, 'wrong roomId'));
      }
      if (roomObj.status != 'working' && roomObj.status != 'waitting') {
        return Promise.resolve(Common.makeResult(false, 'this pc is stopped', '이 피시는 정지되였습니다.'));
      }
      const aryUser = JSON.parse(users);
      const data = {
        course_name: course_name,
        game_mode: game_mode,
        subCourse1: subCourse1,
        subCourse2: subCourse2,
        title: title,
        // game_context: game_context,
        startedAt: Date(),
        endedAt: Date(),
        game_staus: 0,
        game_holenum: game_holenum,
        player_num: player_num,
        player_num_login: player_num_login,
        login_players: aryUser,
        scores: {},
        option: option
      };
      const gameObj = await roomObj.game.create(data);
      if (!gameObj) {
        return Promise.resolve(Common.makeResult(false, 'gameObj create failed'));
      }

      let gameLogs = {};
      let gameLogIds = [];
      await Promise.all(aryUser.map(async (user, index) => {
        if (user.length > 0) {
          const username = userNames[index] ? userNames[index] : '플레이어' + (index + 1);
          const res = await GameLogs.registerGameLog(user, username, gameObj.id, roomObj.storeId, course_name);
          if (res.success) {
            gameLogs[user] = res.result.id;
            gameLogIds.push(res.result.id);
          } else {
            return Promise.resolve(Common.makeResult(false, res.content));
          }
        }
      }))
      await gameObj.updateAttribute('game_logs', gameLogIds);
      if (roomObj.machineType == 1) {
        const data2 = {
          playStatus: Common.PLAY_STATUS.kPlayStatus_Playing
        };
        //if (roomObj.status == 'waitting') data2.status = 'working';
        await roomObj.updateAttributes(data2);
      } else {
        let now = new Date();
        if (game_mode == 'driving') {
          practice_time = practice_time ? practice_time : roomObj.practice_time;
          //now.setMinutes(now.getMinutes() + practice_time);
        } else {
          if (roomObj.machineType == 0) now.setMinutes(now.getMinutes() + player_num * 60 * game_holenum / 18);
        }
        const data2 = {
          playStatus: Common.PLAY_STATUS.kPlayStatus_Playing,
          playStartTime: Date(),
          playEndTime: now,
          practice_time: practice_time
        };
        //if (roomObj.status == 'waitting') data2.status = 'working';
        await roomObj.updateAttributes(data2);
      }

      return Promise.resolve(Common.makeResult(true, 'success', {
        game: gameObj,
        logs: gameLogs,
        room: roomObj
      }));
    } catch(e) {
      return Promise.reject(e);
    }
  }
  Games.remoteMethod('registerGame', {
    accepts: [
      {arg: 'roomId', type: 'string', required: true, description: '룸아이디'},
      {arg: 'course_name', type: 'string', required: true, description: '코스이름'},
      {arg: 'game_mode', type: 'string', required: true, description: '게임방식 (stroke / doors1 / foursome / driving)'},
      {arg: 'subCourse1', type: 'string', required: true, description: '서브코스1 이름'},
      {arg: 'subCourse2', type: 'string', required: false, description: '서브코스2 이름'},
      {arg: 'title', type: 'string', description: '게임제목'},
      {arg: 'users', type: 'string', required: true, description: '유저아이디목록'},
      {arg: 'userNames', type: 'string', required: true, description: '유저이름목록'},
      {arg: 'player_num', type: 'number', required: true, description: '플레이어수(비로그인사용자포함))'},
      {arg: 'player_num_login', type: 'number', required: true, description: '로그인한 플레이어수'},
      {arg: 'game_context', type: 'string', required: true, description: '게임내용'},
      {arg: 'game_holenum', type: 'number', required: true, description: '홀개수'},
      {arg: 'option', type: 'object', required: false, description: '게임설정내용'},
      {arg: 'practice_time', type: 'number', required: false, description: '연습장시간'},
    ],
    description: [
      '(프로그램) 게임을 시작할때 게임자료를 생성\n',
      'role: user, manager'
    ],
    returns: {arg: 'res', type: 'string'},
    http: {path:'/register-game', verb: 'post'}
  });

  // register
  Games.registerGame_v2 = async(roomId, course_name, game_mode, subCourse1, subCourse2, title, users, userNames, player_num, player_num_login, game_context, game_holenum, option, practice_time) => {
    var Room = Games.app.models.Room;
    var GameLogs = Games.app.models.GameLogs;

    try {
      const roomObj = await Room.findById(roomId);
      const storeObj = await roomObj.store();
      if (!roomObj) {
        return Promise.resolve(Common.makeResult(false, 'wrong roomId'));
      }
      if (roomObj.status != 'working' && roomObj.status != 'waitting') {
        return Promise.resolve(Common.makeResult(false, 'this pc is stopped', '이 피시는 정지되였습니다.'));
      }
      const aryUser = users;
      const data = {
        course_name: course_name,
        game_mode: game_mode,
        subCourse1: subCourse1,
        subCourse2: subCourse2,
        title: title,
        // game_context: game_context,
        startedAt: Date(),
        endedAt: Date(),
        game_staus: 0,
        game_holenum: game_holenum,
        player_num: player_num,
        player_num_login: player_num_login,
        login_players: aryUser,
        scores: {},
        option: option,
        storeId: storeObj.id
      };
      const gameObj = await roomObj.game.create(data);
      if (!gameObj) {
        return Promise.resolve(Common.makeResult(false, 'gameObj create failed'));
      }

      let gameLogs = {};
      let gameLogIds = [];
      await Promise.all(aryUser.map(async (user, index) => {
        if (user.length > 0) {
          const username = userNames[index] ? userNames[index] : '플레이어' + (index + 1);
          const res = await GameLogs.registerGameLog(user, username, gameObj.id, roomObj.storeId, course_name);
          if (res.success) {
            gameLogs[user] = res.result.id;
            gameLogIds.push(res.result.id);
          } else {
            return Promise.resolve(Common.makeResult(false, res.content));
          }
        }
      }))
      await gameObj.updateAttribute('game_logs', gameLogIds);
      if (roomObj.machineType == 1) {
        const data2 = {
          playStatus: Common.PLAY_STATUS.kPlayStatus_Playing
        };
        //if (roomObj.status == 'waitting') data2.status = 'working';
        await roomObj.updateAttributes(data2);
      } else {
        let now = new Date();
        if (game_mode == 'driving') {
          practice_time = practice_time ? practice_time : roomObj.practice_time;
          //now.setMinutes(now.getMinutes() + practice_time);
        } else {
          if (roomObj.machineType == 0) now.setMinutes(now.getMinutes() + player_num * 60 * game_holenum / 18);
        }
        const data2 = {
          playStatus: Common.PLAY_STATUS.kPlayStatus_Playing,
          playStartTime: Date(),
          playEndTime: now,
          practice_time: practice_time
        };
        //if (roomObj.status == 'waitting') data2.status = 'working';
        await roomObj.updateAttributes(data2);
      }

      const dt = new Date();
      const strTime = `${
        (dt.getMonth()+1).toString().padStart(2, '0')}-${
        dt.getDate().toString().padStart(2, '0')}-${
        dt.getFullYear().toString().padStart(4, '0')} ${
        dt.getHours().toString().padStart(2, '0')}:${
        dt.getMinutes().toString().padStart(2, '0')}:${
        dt.getSeconds().toString().padStart(2, '0')}`;
      //man
      const params = {
        courseCd: course_name,
        subCourse1: subCourse1,
        subCourse2: subCourse2,
        gameName: "title",
        holeNum: game_holenum,
        gameMode: game_mode,
        gameStatus: 0,
        currentHole: 0,
        startTime: strTime,
        endTime: strTime,
        mGameCd: gameObj.id.toString(),
        mRoomCd: roomObj.id.toString(),
        mStoreCd: roomObj.storeId.toString(),
        flagYN: 'Y',
        issueID: 'API'
    }
    var response = await request('http://man.doorsgolf.com/webIF/saveIFGame', {
        method: 'POST',
        data: params
    })

      return Promise.resolve(Common.makeResult(true, 'success', {
        game: gameObj,
        logs: gameLogs,
        room: roomObj
      }));
    } catch(e) {
      return Promise.reject(e);
    }
  }
  Games.remoteMethod('registerGame_v2', {
    accepts: [
      {arg: 'roomId', type: 'string', required: true, description: '룸아이디'},
      {arg: 'course_name', type: 'string', required: true, description: '코스이름'},
      {arg: 'game_mode', type: 'string', required: true, description: '게임방식 (stroke / doors1 / foursome / driving)'},
      {arg: 'subCourse1', type: 'string', required: true, description: '서브코스1 이름'},
      {arg: 'subCourse2', type: 'string', required: false, description: '서브코스2 이름'},
      {arg: 'title', type: 'string', description: '게임제목'},
      {arg: 'users', type: 'array', required: true, description: '유저아이디목록'},
      {arg: 'userNames', type: 'array', required: true, description: '유저이름목록'},
      {arg: 'player_num', type: 'number', required: true, description: '플레이어수(비로그인사용자포함))'},
      {arg: 'player_num_login', type: 'number', required: true, description: '로그인한 플레이어수'},
      {arg: 'game_context', type: 'string', required: true, description: '게임내용'},
      {arg: 'game_holenum', type: 'number', required: true, description: '홀개수'},
      {arg: 'option', type: 'object', required: false, description: '게임설정내용'},
      {arg: 'practice_time', type: 'number', required: false, description: '연습장시간'},
    ],
    description: [
      '(프로그램) 게임을 시작할때 게임자료를 생성\n',
      'role: user, manager'
    ],
    returns: {arg: 'res', type: 'string'},
    http: {path:'/register-game_v2', verb: 'post'}
  });


  // update
  Games.updateGame = async(gameId, game_staus, current_hole, player_num, scores, putting_nums, game_context, game_data) => {
    const Accounts = Games.app.models.Accounts;
    var GameLogs = Games.app.models.GameLogs;
    var Room = Games.app.models.Room;
    var GameData = Games.app.models.GameData;
    try {
      let gameObj = await Games.findById(gameId)
      if (!gameObj) {
        return Promise.resolve(Common.makeResult(false, 'wrong gameId'));
      }      

      await Promise.all(gameObj.game_logs.map(async logId => {
        const logObj = await GameLogs.findById(logId);
        if (!logObj) {
          return Promise.resolve(Common.makeResult(false, 'wrong logId'));
        } else {
          if ((current_hole == 9 || current_hole == 18) || game_staus == 1) {
            const playerScores = scores[logObj.playerId];
            const putting_num = putting_nums[logObj.playerId];
            if (playerScores) {
              let gameScore = 0;
              let nHoleCnt = 0;
              for (let score of playerScores) {
                if (score != 99) {
                  gameScore += score;
                  nHoleCnt++;
                }
              }
              if (nHoleCnt > 0) {
                const logData = {
                  game_status: game_staus,
                  holeIndex: current_hole,
                  scores: playerScores,
                  score: gameScore,
                  putting_num: putting_num,
                  game_num: nHoleCnt,
                  endedAt: Date()
                }
                const game_record = game_context[logObj.playerId];
                let userObj;
                if (game_record) {
                  userObj = await logObj.accounts.get();
                  if (userObj) {
                    logData.mulligans = game_record.mulligans;
                    if (game_staus == 1) {
                      logData.game_context = game_record;
                      //man
                      const params = {
                        userID: userObj.username,
                        scoreSet: playerScores.toString(),
                        mGameCd: gameObj.id.toString(),
                        mGameLogCd: logObj.id.toString(),
                        flagYN: 'Y',
                        issueID: 'API'
                      }
                      var response = await request('http://man.doorsgolf.com/webIF/saveIFGameLogs', {
                          method: 'POST',
                          data: params
                      })
                      //man
                      const params2 = {
                        userID: userObj.username,
                        mulligunSet: logData.mulligans.toString(),
                        mGameCd: gameObj.id.toString(),
                        mGameLogCd: logObj.id.toString(),
                        flagYN: 'Y',
                        issueID: 'API'
                      }
                      var response = await request('http://man.doorsgolf.com/webIF/saveIFMulligun', {
                          method: 'POST',
                          data: params2
                      })
                      //man
                      const params3 = {
                        userID: userObj.username,
                        puttingSet: putting_num.toString(),
                        mGameCd: gameObj.id.toString(),
                        mGameLogCd: logObj.id.toString(),
                        flagYN: 'Y',
                        issueID: 'API'
                      }
                      var response = await request('http://man.doorsgolf.com/webIF/saveIFPutting', {
                          method: 'POST',
                          data: params3
                      })
                    }
                  }
                }
                await logObj.updateAttributes(logData);
                if (logData.game_context) {
                  if (!userObj) {
                    userObj = await logObj.accounts.get();
                    await Accounts.resetAverageScore(userObj, logData.game_context);
                  }
                }
              }
            }
          }
          if (game_data && game_data[logObj.playerId]) {
            await GameData.createData(game_data[logObj.playerId], logObj.playerId, gameId, logObj.id, current_hole);
          }
        }
      }))
      let hole_game_logs = gameObj.hole_game_logs ? gameObj.hole_game_logs : [];
      hole_game_logs.push({
        holeIndex: current_hole,
        endedAt: Date(),
        player_num: player_num
      })
      const data = {
        game_staus: game_staus,
        current_hole: current_hole,
        scores: scores,
        putting_nums: putting_nums,
        game_context: game_context,
        endedAt: Date(),
        hole_game_logs: hole_game_logs
      }
      gameObj = await gameObj.updateAttributes(data);
      // if (game_staus != 0) {
      //   const roomObj = await Room.findById(gameObj.roomId);
      //   if (roomObj.status == 'working')
      //     await roomObj.updateAttribute('status', 'waitting');
      // }

      return Promise.resolve(Common.makeResult(true, 'success', gameObj));
    } catch(e) {
      return Promise.resolve(Common.makeResult(false, e.message));
    }
  }
  Games.remoteMethod('updateGame', {
    accepts: [
      {arg: 'gameId', type: 'string', required: true, description: '게임아이디'},
      {arg: 'game_staus', type: 'number', required: true, description: '0: 진행중, 1: 완전종료, 2: 탈퇴종료'},
      {arg: 'current_hole', type: 'number', required: true, description: '현재 홀번호'},
      {arg: 'player_num', type: 'number', required: true, description: '현재 플레이어수'},
      {arg: 'scores', type: 'object', required: true, description: '현재 플레이어스코어'},
      {arg: 'putting_nums', type: 'object', required: true, description: '현재 퍼팅수'},
      {arg: 'game_context', type: 'object', required: false, description: ''},
      {arg: 'game_data', type: 'object', required: false, description: ''},
    ],
    description: [
      '(프로그램) 업데이트',
    ],
    returns: {arg: 'res', type: 'string', description: '갱신된 게임정보를 리턴한다.'},
    http: {path:'/update-game', verb: 'post'}
  });


  
  // get scorecard
  Games.getScoreCard = async(gameId) => {
    try {
      let gameObj = await Games.findById(gameId)
      if (!gameObj) {
        return Promise.resolve(Common.makeResult(false, 'wrong gameId'));
      }
      const gameLogs = await gameObj.game_log.getAsync();
      return Promise.resolve(Common.makeResult(true, 'success', gameLogs));
    } catch(e) {
      return Promise.reject(e);
    }
  }
  Games.remoteMethod('getScoreCard', {
    accepts: [
      {arg: 'gameId', type: 'string', required: true, description: '게임아이디'},
    ],
    description: [
      '(매니저웹) 스코어카드얻기',
    ],
    returns: {
      arg: 'res',
      type: 'string',
      description: [
        '\n'
      ]
    },
    http: {path:'/get-scorecard', verb: 'get'}
  });


  Games.getGamesCount = async(game_holenum, t1, t2, rooms) => {
    try {
      let query_game = {
        where: {
          game_holenum: game_holenum,
          endedAt: { between: [t1, t2] },
        }
      }
      if (rooms) {
        let roomIds = [];
        for (let roomObj of rooms) {
          roomIds.push(roomObj.id.toString());
        }
        query_game.where.roomId = {
          inq: roomIds
        }
      }
      const games = await Games.find(query_game);
      let game_player = 0;
      let game_player_login = 0;
      for (let gameObj of games) {
        game_player += gameObj.player_num;
        if (gameObj.player_num_login) {
          game_player_login += gameObj.player_num_login;
        }
        //const games = await gameObj.game_log.count();
      }
      return Promise.resolve({
        game_player: game_player,
        game_player_login: game_player_login
      });
    } catch(e) {
      return Promise.reject(e);
    }
  }


  Games.getUserGameLogs = async(t1, t2, rooms) => {
    const Accounts = Games.app.models.Accounts;
    try {
      let roomIds = [];
      for (let roomObj of rooms) {
        roomIds.push(roomObj.id.toString());
      }
      let query_game = {
        where: {
          endedAt: { between: [t1, t2] },
          roomId: { inq: roomIds }
        }
      }
      const games = await Games.find(query_game);
      let game_player = 0;
      let game_player_login = 0;
      let userIds = [];
      
      const users = {};
      for (let gameObj of games) {
        if (gameObj.login_players) {
          for (let userId of gameObj.login_players) {
            if (users[userId]) {
              users[userId].count++;
            } else {
              users[userId] = {
                count: 1
              }
            }
          }
        }
      }
      const query_user = {
        fields: ['id', 'username', 'nickname', 'phone_number'],
      }
      const results = [];
      await Promise.all(Object.keys(users).map(async userId => {
        const userObj = await Accounts.findById(userId, query_user);
        if (userObj) {
          userObj.count = users[userId].count;
          results.push({
            user: userObj,
          });
        } else {
          //error db
          console.error(userId);
        }
      }))
      return Promise.resolve(results);
    } catch(e) {
      return Promise.reject(e);
    }
  }
  

  //
  Games.updateSetting = async(gameId, option, setting) => {
    try {
      const gameObj = await Games.findById(gameId);
      if (!gameObj) {
        return Promise.resolve(Common.makeResult(false, 'find not game id', '잘못된 아이디입니다.'));
      }
      const data = {
        option: option,
        player_num: setting.player_num
      }
      // if (gameObj.player_num != setting.player_num) {
      //   const Room = Games.app.models.Room;
      //   const roomObj = await Room.findById(gameObj.roomId);
      //   if (roomObj) {
      //     await roomObj
      //   }
      // }
      const result = await gameObj.updateAttributes(data);
      return Promise.resolve(Common.makeResult(true, 'success', result));
    } catch(e) {
      return Promise.reject(e);
    }
  }
  
  Games.remoteMethod('updateSetting', {
    accepts: [
      {arg: 'gameId', type: 'string', required: true, description: '게임 아이디'},
      {arg: 'option', type: 'object', required: true, description: '게임 설정내용'},
      {arg: 'setting', type: 'object', required: true, description: '게임 설정내용'},
    ],
    description: [
      '(전체) 룸별게임현황페이지에서 게임설정을 보관한다.\n',
    ],
    returns: {arg: 'res', type: 'object'},
    http: {path:'/update-setting', verb: 'post'}
  });
};
