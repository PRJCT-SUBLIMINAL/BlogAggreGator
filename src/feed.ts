import { db } from "./lib/db";
import { XMLParser } from "fast-xml-parser";
import {readConfig} from "./config"
import { users, feeds, feedFollows } from "./lib/db/schema"
import {getUser, getUserById} from "./lib/db/queries/users"
import { eq, and } from "drizzle-orm";
import { registerHooks } from "node:module";

type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedUrl: string): Promise<RSSFeed> {
    const feed = await fetch(feedUrl, {
        "method": "GET",
        "headers": { "User-Agent": "gator" }
    })

    const xml = await feed.text();

    const parser = new XMLParser({processEntities: false});
    let jObj = parser.parse(xml);

    const channel = jObj.rss?.channel;

    if (!channel) throw new Error("failure to parse channel");

    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item]: [];
    const newItems: RSSItem[] = [];

    for (const item of items) {
        if (!item.title || !item.link || !item.description || !item.pubDate) continue;
        newItems.push(item)
    }

    return {channel: {title: channel.title, link: channel.link, description: channel.description, item: newItems}};
}

export async function agg(cmdName: string, ...args: string[]) {
    const feed = await fetchFeed("https://www.wagslane.dev/index.xml")
    console.log(JSON.stringify(feed, null, 2));
}

export async function getFeeds() {
    const result = await db.select().from(feeds)
    return result
}

export async function addFeed(cmdCommand: string, ...args: string[]) {
    if (args.length < 2) throw new Error("You need to provide a feed [Name] and [URL]: addFeed [name] [url]");

    const config = readConfig();
    const currentUserName = config.currentUserName;

    const user = await getUser(`${currentUserName}`);

    const name = args[0];
    const url = args[1];

    const feed = await createFeed(name, url, user.id)
    await createFeedFollow(user.id, feed.id);
    printFeed(feed, user);
}

export async function createFeed(name: string, url: string, userId: string) {
    const [result] = await db.insert(feeds).values({ name: name, url: url, userId: userId}).returning();
    return result;
}

export async function deleteFeedFollow(userId: string, url: string) {
    const feed = await getFeedByURL(url);
    await db.delete(feedFollows).where(and(eq(feedFollows.feedId, feed.id), eq(feedFollows.userId, userId)));
}

export async function createFeedFollow(userId: string, feedId: string) {
    const [result] = await db.insert(feedFollows).values({ userId: userId, feedId: feedId }).returning();
    const [result2] = await db.select().from(feedFollows).where(eq(feedFollows.id, result.id)).innerJoin(feeds, eq(feedFollows.feedId, feeds.id)).innerJoin(users, eq(feedFollows.userId, users.id));
    return result2;
}

export async function getFeedByURL(url: string) {
    const [feed] = await db.select().from(feeds).where(eq(feeds.url, url));
    return feed;
}

export async function getFeedFollowsForUser(userId: string) {
    const feedFollowsForUser = await db.select().from(feedFollows).where(eq(feedFollows.userId, userId)).innerJoin(feeds, eq(feedFollows.feedId, feeds.id));
    return feedFollowsForUser;
}

function printFeed(feed: any, user: any) {
    console.log(`ID: ${feed.id}`);
    console.log(`Created: ${feed.createdAt}`);
    console.log(`Updated: ${feed.updatedAt}`);
    console.log(`Name: ${feed.name}`);
    console.log(`URL: ${feed.url}`);
    console.log(`User: ${user.name}`)
}

export async function printFeeds() {
    const result = await getFeeds();
    for (const feed of result) {
        const user = await getUserById(feed.userId);
        console.log(`${feed.name}`);
        console.log(`${feed.url}`);
        console.log(`${user.name}`);
    }
}