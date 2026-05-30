export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>

export function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
    registry[cmdName] = handler
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
    const command = registry[cmdName];
    if (!command) throw new Error("Command not registered: " + cmdName);
    await command(cmdName, ...args);
}