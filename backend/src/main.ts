import {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal
} from "./match_handler";

function InitModule(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    initializer: nkruntime.Initializer
) {

    logger.info("Tic-Tac-Toe module loaded successfully");

    initializer.registerMatch("tic-tac-toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });

    initializer.registerRpc("create_match", function (
        ctx: nkruntime.Context,
        logger: nkruntime.Logger,
        nk: nkruntime.Nakama,
        payload: string
    ) {

        const matchId = nk.matchCreate("tic-tac-toe", {});

        return JSON.stringify({
            matchId: matchId
        });

    });

    initializer.registerRpc("find_match", function (
        ctx: nkruntime.Context,
        logger: nkruntime.Logger,
        nk: nkruntime.Nakama,
        payload: string
    ) {

        const matches = nk.matchList(
            10,
            true,
            "tic-tac-toe",
            0,
            1
        );

        if (matches.length > 0) {
            return JSON.stringify({
                matchId: matches[0].matchId
            });
        }

        const matchId = nk.matchCreate("tic-tac-toe", {});

        return JSON.stringify({
            matchId: matchId
        });

    });

}

// expose to Nakama runtime
// @ts-ignore
globalThis.InitModule = InitModule;