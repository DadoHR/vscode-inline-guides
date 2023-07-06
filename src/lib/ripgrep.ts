import { rgPath } from '@vscode/ripgrep';
import { execFile } from 'node:child_process';

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

export function run(query: string, options: { cwd: string }) {
  return new Promise<RipgrepMessage[]>((resolve, reject) => {
    execFile(
      rgPath,
      ['--json', query, '.'],
      options,
      (error, stdout, stderr) => {
        if (error) {
          console.error(stderr);
          reject(error);
          return;
        }

        resolve(parseJsonOutput(stdout));
      }
    );
  });
}
