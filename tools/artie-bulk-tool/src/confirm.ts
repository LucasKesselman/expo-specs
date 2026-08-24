import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function prompt(message: string): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(`${message} `)).trim();
  } finally {
    rl.close();
  }
}

/** Returns true only for exactly `y` or `Y`. */
export async function confirmYesNo(message: string): Promise<boolean> {
  const answer = await prompt(message);
  return answer === "y" || answer === "Y";
}

export async function confirmTyped(message: string, expected: string): Promise<boolean> {
  const answer = await prompt(message);
  return answer === expected;
}
