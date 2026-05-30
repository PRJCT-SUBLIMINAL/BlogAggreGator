import {setUser} from "./config"
import { createUser, getUser, resetUsers } from "./lib/db/queries/users";

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

export async function reset(cmName: string, ...args: string[]) {
    await resetUsers();
}