import os from "os";
import fs from "fs";
import path from "path";

export type Config = {
    dbUrl: string;
    currentUserName?: string;
}

export function setUser(username: string) {
    const config = readConfig();
    config.currentUserName = username;
    writeConfig(config);
}

export function readConfig(): Config {
    const configFilePath = getConfigFilePath();
    const fileContents = fs.readFileSync(configFilePath, "utf-8");
    const rawConfig = JSON.parse(fileContents);

    return validateConfig(rawConfig);
}

function getConfigFilePath(): string {
    return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config {
    return {dbUrl: rawConfig.db_url, currentUserName: rawConfig.current_user_name};
}

function writeConfig(config: Config) {
    const rawConfig = {
        db_url: config.dbUrl,
        current_user_name: config.currentUserName
    };

    const configString = JSON.stringify(rawConfig);
    const configFilePath = getConfigFilePath();
    fs.writeFileSync(configFilePath, configString);
}