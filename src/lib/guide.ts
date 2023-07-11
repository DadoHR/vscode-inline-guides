import { RipgrepMessageMatch, run } from './ripgrep.js';

const GUIDE_LINE_SEARCH_REGEX = '@guide\\s+.+\\s+-\\s+[0-9]+(.[0-9]+)*\\s+.+';
const GUIDE_LINE_PARSE_REGEX =
  /@guide\s+(?<name>.+)\s+-\s+(?<step>[0-9]+(\.[0-9]+)*)\s+(?<description>.+)$/m;

export type GuideStep = {
  name: string;
  step: string;
  location: {
    filePath: string;
    lineNumber: number;
  };
};

export type Guide = {
  name: string;
  steps: { [step: string]: GuideStep };
};

export type GuideTree = { [key: string]: Guide };

export type GuideItem = {
  name: string;
  step: string;
  description: string;

  location: {
    filePath: string;
    lineNumber: number;
  };
};

export class GuideParseError extends Error {
  constructor(
    error: string,
    public readonly info: Partial<
      Pick<GuideItem, 'name' | 'step' | 'description'>
    > & {
      line: string;
    }
  ) {
    super(error);
  }
}

export function getInfoFromLine(line: string) {
  const { name, step, description } =
    GUIDE_LINE_PARSE_REGEX.exec(line.trim())?.groups ?? {};

  if (!name || !step || !description) {
    throw new GuideParseError('Guide doesn’t meet format', {
      line,
      name,
      step,
      description
    });
  }

  return {
    name,
    step,
    description
  };
}

export function createGuideItemFromMessage(
  message: RipgrepMessageMatch
): GuideItem {
  const info = getInfoFromLine(message.data.lines.text);

  return {
    ...info,
    location: {
      filePath: message.data.path.text,
      lineNumber: message.data.line_number
    }
  };
}

export function sortByStep(guides: GuideItem[]): GuideItem[] {
  return Array.from(guides).sort((a, b) =>
    a.step.localeCompare(b.step, 'en', {
      numeric: true
    })
  );
}

export async function getGuides(workspacePath: string): Promise<GuideItem[]> {
  const ripgrepMessages = await run(GUIDE_LINE_SEARCH_REGEX, {
    cwd: workspacePath
  });
  const matches = ripgrepMessages.filter(
    (m): m is RipgrepMessageMatch => m.type === 'match'
  );

  return sortByStep(
    matches
      .map<GuideItem | null>((message) => {
        try {
          return createGuideItemFromMessage(message);
        } catch {
          return null;
        }
      })
      .filter((item): item is GuideItem => item !== null)
  );
}

export function getGuideTree(guides: GuideItem[]): GuideTree {
  const guidesByName = guides.reduce<Map<string, Guide>>((tree, guideItem) => {
    const step: Guide['steps'][number] = {
      location: guideItem.location,
      name: guideItem.description,
      step: guideItem.step
    };

    if (tree.has(guideItem.name)) {
      const guide = tree.get(guideItem.name)!;

      guide.steps[step.step] = step;
    } else {
      const guide: Guide = {
        name: guideItem.name,
        steps: { [step.step]: step }
      };
      tree.set(guideItem.name, guide);
    }

    return tree;
  }, new Map<string, Guide>());

  return Object.fromEntries(guidesByName.entries());
}
