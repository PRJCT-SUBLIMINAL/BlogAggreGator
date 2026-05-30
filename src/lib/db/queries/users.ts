import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";
import {readConfig} from "../../../config";

export async function createUser(name: string) {
    const [result] = await db.insert(users).values({ name: name }).returning();
    return result;
}

export async function getUser(name: string) {
    const [result] = await db.select().from(users).where(eq(users.name, name));
    return result;
}

export async function getUserById(userId: string) {
    const [result] = await db.select().from(users).where(eq(users.id, userId));
    return result;
}

export async function resetUsers() {
    await db.delete(users);
    console.log("All users deleted successfully!");
}

export async function getUsers() {
    const result = await db.select({name: users.name}).from(users);
    const config = readConfig();
    result.forEach((user: {name: string}) => {
        if (user.name === config.currentUserName) {
            console.log("* "+user.name+" (current)");
        } else {
            console.log("* "+user.name);
        }
    });
}