import { db } from "./lib/db";
import { XMLParser } from "fast-xml-parser";
import {readConfig} from "./config"
import { users, feeds, feedFollows, posts, NewPost } from "./lib/db/schema"
import {getUser, getUserById} from "./lib/db/queries/users"
import { eq, and, sql, desc } from "drizzle-orm";
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

export function parseDuration(durationStr: string): number {
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationStr.match(regex);
    if (!match) throw new Error("You must input the correct time format e.g: (1m0s)");

    switch(match[2]) {
        case "ms":
            return parseInt(match[1], 10);
        case "s":
            return parseInt(match[1], 10) * 1000;
        case "m":
            return parseInt(match[1], 10) * 60 * 1000;
        case "h":
            return parseInt(match[1], 10) * 60 * 60 * 1000;
        default:
            throw new Error("Invalid time unit");
    }
}

export async function agg(cmdName: string, ...args: string[]) {
    if (args.length === 0) throw new Error("You need to input a time amount after the command.");
    
    const ms = parseDuration(args[0]);
    console.log(`Collecting feeds every ${args[0]}`);

    scrapeFeeds().catch(console.error);

    const interval = setInterval(() => {
        scrapeFeeds().catch(console.error);
    }, ms);

    await new Promise<void>((resolve) => {
        process.on("SIGINT", () => {
            console.log("Shutting down feed aggregator...");
            clearInterval(interval);
            resolve();
        });
    });
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

export async function markFeedFetched(feedId: string) {
    await db.update(feeds).set({ lastFetchedAt: new Date(), updatedAt: new Date() }).where(eq(feeds.id, feedId));
}

export function firstOrUndefined<T>(arr: T[]): T | undefined {
  return arr[0];
}

export async function getNextFeedToFetch() {
    const feed = await db.select().from(feeds).orderBy(sql`${feeds.lastFetchedAt} asc nulls first` ).limit(1);

    return firstOrUndefined(feed);
}

export async function scrapeFeeds() {
    const result = await getNextFeedToFetch();
    if (!result) throw new Error("Couldn't fetch feed.");

    const feed = await fetchFeed(result.url);
    await markFeedFetched(result.id);

    if (!feed.channel.item) throw new Error("No feed item found!");

    for (const feedItem of feed.channel.item) {
        await createPost({title: feedItem.title, url: feedItem.link, description: feedItem.description, feedId: result.id, publishedAt: new Date(feedItem.pubDate)});
    }
}

export async function createPost(post: NewPost) {
    const [insertedPost] = await db.insert(posts).values(post).returning();
    return insertedPost;
}

export async function getPostsForUser(userId: string, amount: number = 2) {
    const results = await db.select().from(posts).innerJoin(feedFollows, eq(posts.feedId, feedFollows.feedId)).where(eq(feedFollows.userId, userId)).orderBy(desc(posts.publishedAt)).limit(amount);
    return results;
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