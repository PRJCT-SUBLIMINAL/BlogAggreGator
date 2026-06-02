import {handlerLogin, registerLogin, reset, follow, following, unfollow} from "./command_functions";
import {CommandHandler, CommandsRegistry, registerCommand, runCommand} from "./commands";
import {getUsers} from "./lib/db/queries/users";
import {agg, addFeed, printFeeds} from "./feed";

async function main() {
    const registry: CommandsRegistry = {};
    registerCommand(registry, "login", handlerLogin);
    registerCommand(registry, "register", registerLogin);
    registerCommand(registry, "reset", reset);
    registerCommand(registry, "users", getUsers);
    registerCommand(registry, "agg", agg);
    registerCommand(registry, "addfeed", addFeed);
    registerCommand(registry, "feeds", printFeeds);
    registerCommand(registry, "follow", follow);
    registerCommand(registry, "following", following);
    registerCommand(registry, "unfollow", unfollow);

    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("ERROR! Args length needs to be 1 or more");
        process.exit(1);
    }

    const [command, ...rest] = args;

    try {
        await runCommand(registry, command, ...rest);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
    process.exit(0);
}

main();