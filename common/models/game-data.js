'use strict';

module.exports = function(GameData) {
    GameData.createData = async(game_data, playerId, gameId, gameLogId, holeIndex) => {
        if (game_data.data) {
            await GameData.create({
                playerId: playerId,
                gameId: gameId,
                gameLogId: gameLogId,
                holeIndex: holeIndex,
                data: game_data.data,
                createdAt: Date()
            })
        }
    }
};
