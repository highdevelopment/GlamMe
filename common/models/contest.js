'use strict';

var Common = require('./common.js');

module.exports = function(Contest) {
    Contest.disableRemoteMethodByName("upsert");
    Contest.disableRemoteMethodByName("find");
    Contest.disableRemoteMethodByName("replaceOrCreate");
    Contest.disableRemoteMethodByName("create");
  
    Contest.disableRemoteMethodByName("prototype.updateAttributes");
    Contest.disableRemoteMethodByName("findById");
    Contest.disableRemoteMethodByName("exists");
    Contest.disableRemoteMethodByName("replaceById");
    Contest.disableRemoteMethodByName("deleteById");
  
    Contest.disableRemoteMethodByName("createChangeStream");
  
    Contest.disableRemoteMethodByName("count");
    Contest.disableRemoteMethodByName("findOne");
  
    Contest.disableRemoteMethodByName("update");
    Contest.disableRemoteMethodByName("upsertWithWhere");

    Contest.getContests = async(search_title, search_number, roomId) => {
        if (!search_title) search_title = '';
        if (!search_number) search_number = '';
        const pageNum = 1000;
        const pageIndex = 0;
        const query = {
            where: {
                title: {like: search_title, options: 'i'}
            },
            limit: pageNum,
            skip: pageNum * pageIndex,
            order: 'modifiedAt DESC'
        }
        try {
            const contests = await Contest.find(query);
            // contests.map(contest => {
            //     contest.photo = contest.photo ? Common.FILE_SERVER_PATH + contest.photo : '';
            // })
            return Promise.resolve(Common.makeResult(true, 'success', contests));
        } catch(e) {
            return Promise.reject(e);
        }
    }
    Contest.remoteMethod('getContests', {
        accepts: [
            {arg: 'search_title', type: 'string', description: '검색문자열, 빈문자열일때 전체검색'},
            {arg: 'search_number', type: 'string', description: '대회번호검색'},
            {arg: 'roomId', type: 'string', description: '피시가 설치된 룸아이디'},
        ],
        description: [
            '(전체) 전체대회목록\n'
        ],
        returns: {
            arg: 'res',
            type: 'string',
            description: [
                "\n",
                "qualification = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];",
                "\n",
                "course = ['Acro', 'Dreampark', 'Gumi'];",
                "\n",
                "option = {\
                    \n'difficulty': 1     //난이도 (0: 일반 / 1: 세미투어 / 2: 투어)  \
                    \n'green': 1,         //그린상태 (0: 보통, 1: 약간 빠름, 2: 매우빠름  \
                    \n'mulligan': 2,      //멀리건 횟수  \
                    \n'swingplate': 0,    //스윙플레이트 (보통 0, 어려움 1) \
                    \n'wind_strength': 1, //바람세기 (약하게 0, 보통 1, 강하게 2)\
                    \n'wind_apply': 0,    //바람적용 (시스템간 동일 0)\
                    \n'concede': 100,     //컨시드 (cm 단위)\
                    \n'weather': 0,       //날씨 (맑음 0, 흐림 1)\
                    \n'teeup': 12,        //티업시간 (h)\
                    \n'pin_pos': 0,       //핀위치 (일괄중핀 0)\
                    \n'tee_male': 3,      //티샷위치(남) (0: Black, 1: Blue, 2: White, 3: Yellow, 4: Red)\
                    \n'tee_female': 0     //티샷위치(여) (0: Black, 1: Blue, 2: White, 3: Yellow, 4: Red)\
                \n}",
                "\n",
                "conditions = {\
                    \n'use_goods': true,    //플러스 상품사용\
                    \n'use_mat': true,      //매트룰사용\
                    \n'longest': {\
                    \n    enable: true,     //롱기스트설정\
                    \n    hole_A: 5,        //A코스에 5홀을 선택\
                    \n    hole_B: 8,        //B코스에 8홀을 선택\
                    \n    hole_C: 14        //C코스에 14홀을 선택\
                    \n},\
                    \n'nearpin': {\
                    \n    enable: true,     //니어핀설정\
                    \n    hole_A: 13,\
                    \n    hole_B: 12,\
                    \n    hole_C: 16\
                    \n},\
                    \n'stores': []          //매장아이디목록\
                \n}",
                "\n",
                "revision = {\
                    \nisUse: false, //보정치 사용함/안함\
                    \nlevel: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], //실력등급별 스코어보정치\
                    \nfemale: 0,                  //여성회원추가 보정치\
                    \nround: {                    //다라운드 보정치\
                    \n    first_round: 0,         //라운드 이상시 0: 설정안함\
                    \n    first_revision: 0,      //보정치 0: 설정안함\
                    \n    second_round: 0,        //라운드 이상시 0: 설정안함\
                    \n    second_revision: 0,     //보정치 0: 설정안함\
                    \n}\
                \n}"
            ]
        },
        http: {path:'/get-contests', verb: 'get'}
    });

    
    // register
    Contest.registerContest = async(password, qualification, isAllowPartner, limitEnter, 
        title, description, startAt, endAt, course, option, conditions,
        revision, award, photo, banner, html_guidline) => {
        try {
            if (!qualification) qualification = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
            if (!limitEnter) limitEnter = -1;
            if (!course) course = ['Acro', 'Dreampark', 'Gumi'];
            if (!option) {
                option = {
                    'difficulty': 1, //(0: 일반 / 1: 세미투어 / 2: 투어)
                    'green': 1, //0: 보통, 1: 약간 빠름, 2: 매우빠름
                    'mulligan': 2,
                    'swingplate': 0,
                    'wind_strength': 1,
                    'wind_apply': 0,
                    'concede': 100,
                    'weather': 0,
                    'teeup': 12,
                    'pin_pos': 0,
                    'tee_male': 0,
                    'tee_female': 0
                }
            }
            if (!conditions) {
                conditions = {
                    'use_goods': true,
                    'use_mat': true,
                    'longest': {
                        enable: true,
                        hole_A: 5,
                        hole_B: 8,
                        hole_C: 14
                    },
                    'nearpin': {
                        enable: true,
                        hole_A: 13,
                        hole_B: 12,
                        hole_C: 16
                    },
                    'stores': []
                }
            }
            if (!revision) {
                revision = {
                    isUse: false, //보정치 사용함/안함
                    level: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], //실력등급별 스코어보정치
                    female: 0,                  //여성회원추가 보정치
                    round: {                    //다라운드 보정치
                        first_round: 0,         //라운드 이상시 0: 설정안함
                        first_revision: 0,      //보정치 0: 설정안함
                        second_round: 0,        //라운드 이상시 0: 설정안함
                        second_revision: 0,     //보정치 0: 설정안함
                    }
                }
            }
            if (!award) {
                award = ['goods1', 'goods2', 'goods3'];
            }
            const Container = Contest.app.models.Container;
            const data = {
                password: password,
                qualification: qualification,
                isAllowPartner: isAllowPartner,
                limitEnter: limitEnter,
                title: title,
                description: description,
                startAt: startAt,
                endAt: endAt,
                course: course,
                option: option,
                conditions: conditions,
                revision: revision,
                award: award,
                photo: photo,
                banner: banner,
                html_guidline: html_guidline,
                createdAt: Date(),
                modifiedAt: Date(),
            }
            let contestObj = await Contest.create(data);
            if (photo) {
                const newPath = await Container.ayncMoveFile(photo, 'contest/' + contestObj.id);
                if (newPath) {
                    contestObj = await contestObj.updateAttribute('photo', newPath);
                } else {
                    return Promise.resolve(Common.makeResult(false, 'server problem (file moving)'));
                }
            }
            if (banner) {
                const newPath = await Container.ayncMoveFile(banner, 'contest/' + contestObj.id);
                if (newPath) {
                    contestObj = await contestObj.updateAttribute('banner', newPath);
                } else {
                    return Promise.resolve(Common.makeResult(false, 'server problem (file moving)'));
                }
            }
            return Promise.resolve(Common.makeResult(true, 'success', contestObj));
        } catch(e) {
            return Promise.reject(e);
        }
    }
    Contest.remoteMethod('registerContest', {
        accepts: [
            {arg: 'password', type: 'string', required: true, description: '비밀번호'},
            {arg: 'qualification', type: 'array', required: false, description: '참가대상'},
            {arg: 'isAllowPartner', type: 'boolean', required: true, description: '동반 라운드'},
            {arg: 'limitEnter', type: 'number', required: true, description: '참여 횟수'},
            {arg: 'title', type: 'string', required: true, description: '대회명'},
            {arg: 'description', type: 'string', required: false, description: '대회소개'},
            {arg: 'startAt', type: 'date', required: false, description: '대회시작일'},
            {arg: 'endAt', type: 'date', required: false, description: '대회종료일'},
            {arg: 'course', type: 'array', required: false, description: '코스아이디목록'},
            {arg: 'option', type: 'object', required: false, description: '경기조건\n\tsdsfds'},
            {arg: 'conditions', type: 'object', required: false, description: '추가조건'},
            {arg: 'revision', type: 'object', required: false, description: '스코어보정'},
            {arg: 'award', type: 'array', required: false, description: '스코어보정'},
            {arg: 'photo', type: 'string', required: false, description: '이미지파일경로'},
            {arg: 'banner', type: 'string', required: false, description: '이미지파일경로'},
            {arg: 'html_guidline', type: 'string', required: false, description: '대회요강'},
        ],
        description: [
            '(웹) 대회를 새로 등록\n',
        ],
        returns: {
        arg: 'res',
        type: 'string',
        description: [
        ]
        },
        http: {path:'/register-contest', verb: 'post'}
    });
};
