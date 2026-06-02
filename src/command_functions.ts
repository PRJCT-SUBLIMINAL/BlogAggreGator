import {setUser} from "./config"
import { createUser, getUser, resetUsers } from "./lib/db/queries/users";
import { getFeedByURL, createFeedFollow, getFeedFollowsForUser, deleteFeedFollow } from "./feed";
import { readConfig } from "./config"

export async function handlerLogin(cmdName: string, ...args: string[]) {
    if (args.length === 0) throw new Error("The login handler expects a single argument, the username.");
    
    const user = await getUser(args[0]);
    if (!user) throw new Error("User does not exist!");
    setUser(args[0]);

    console.log("User has been set!")
}

export async function registerLogin(cmdName: string, ...args: string[]) {
    if (args.length === 0) throw new Error("The register handler expects a single argument, a username");
    const name = args[0];
    const user = await getUser(name);
    if (user) throw new Error("User already exists! Username: " + name)

    await createUser(name);

    setUser(name);

    console.log("User registered as: " + args[0])
}

export async function reset(cmdName: string, ...args: string[]) {
    await resetUsers();
}

export async function follow(cmdName: string, ...args: string[]) {
    if (args.length === 0) throw new Error("Expected URL after command!");

    const config = readConfig();

    const feed = await getFeedByURL(args[0]);
    const feedId = feed.id;
    const userName = config.currentUserName;
    if (!userName) throw new Error("User not logged in!");
    const user = await getUser(userName)
    const userId = user.id;

    await createFeedFollow(userId, feedId);
    console.log(feed.name, userName);
}

export async function following(cmdName: string, ...args: string[]) {
    const config = readConfig();
    const userName = config.currentUserName
    if (!userName) throw new Error("User not logged in!");
    const user = await getUser(userName);
    const userId = user.id;

    const follows = await getFeedFollowsForUser(userId);
    if (!follows) throw new Error("No feeds available.");
    for (const follow of follows) {
        console.log(follow.feeds.name);
    }
}

export async function unfollow(cmdName: string, ...args: string[]) {
    if (args.length === 0) throw new Error("You must input a URL after the command!");
    const config = readConfig();
    const userName = config.currentUserName
    if (!userName) throw new Error("User not logged in!");

    const user = await getUser(userName);
    const userId = user.id;

    await deleteFeedFollow(userId, args[0]);
}