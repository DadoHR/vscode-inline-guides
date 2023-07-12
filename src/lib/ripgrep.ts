import promiseSpawn from '@npmcli/promise-spawn';
import { rgPath } from '@vscode/ripgrep';

export type RipgrepMessageBegin = {
  type: 'begin';
  data: {
    path: {
      text: string;
    };
  };
};

export type RipgrepMessageMatch = {
  type: 'match';
  data: {
    path: {
      text: string;
    };
    lines: {
      text: string;
    };
    line_number: number;
    absolute_offset: number;
    submatches: [
      {
        match: {
          text: string;
        };
        start: number;
        end: number;
      }
    ];
  };
};

export type RipgrepMessageEnd = {
  type: 'end';
  data: {
    path: {
      text: string;
    };
  };
};

export type RipgrepMessageSummary = {
  type: 'summary';
  data: {
    elapsed_total: {
      human: string;
      nanos: number;
      secs: number;
    };
    stats: {
      bytes_printed: number;
      bytes_searched: number;
      elapsed: {
        human: string;
        nanos: number;
        secs: number;
      };
      matched_lines: number;
      matches: number;
      searches: number;
      searches_with_match: number;
    };
  };
};

export type RipgrepMessage =
  | RipgrepMessageBegin
  | RipgrepMessageMatch
  | RipgrepMessageEnd
  | RipgrepMessageSummary;

function parseJsonOutput(output: string): RipgrepMessage[] {
  return output
    .split(/\r?\n/g)
    .filter((line) => line.trim().length > 0)
    .map<RipgrepMessage>((line) => JSON.parse(line) as RipgrepMessage);
}

export async function run(
  query: string,
  options: { cwd: string }
): Promise<RipgrepMessage[]> {
  try {
    const result = await promiseSpawn(
      rgPath,
      [query, '.', '--hidden', '--json'],
      options
    );

    return parseJsonOutput(result.stdout);
  } catch (error: any) {
    /* Error code 1 means there are no matches
     * See:
     * - https://github.com/BurntSushi/ripgrep/issues/948
     * - https://github.com/BurntSushi/ripgrep/pull/954
     */
    if (error.code === 1) {
      return [];
    }

    throw error;
  }
}
