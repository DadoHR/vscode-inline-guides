import { RipgrepMessageMatch, run } from './ripgrep.js';

const GUIDE_LINE_PARSE_REGEX =
  /@guide\s+(?<name>.+)\s+-\s+(?<step>[0-9]+(\.[0-9]+)*)\s+(?<description>.+)$/;

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

export function getInfoFromLine(line: string) {
  const { name, step, description } =
    line.match(GUIDE_LINE_PARSE_REGEX)?.groups ?? {};

  if (!name || !step || !description) {
    return null;
  }

  return {
    name,
    step,
    description
  };
}

export function getInfoFromMessage(
  message: RipgrepMessageMatch
): Pick<GuideItem, 'name' | 'step' | 'description'> | null {
  return getInfoFromLine(message.data.lines.text);
}

export function createGuideItemFromMessage(
  message: RipgrepMessageMatch
): GuideItem | null {
  const info = getInfoFromMessage(message);

  if (!info) return null;

  return {
    ...info,
    location: {
      filePath: message.data.path.text,
      lineNumber: message.data.line_number
    }
  };
}

export async function getGuides(workspacePath: string): Promise<GuideItem[]> {
  const ripgrepMessages = await run('@guide', { cwd: workspacePath });
  const matches = ripgrepMessages.filter(
    (m): m is RipgrepMessageMatch => m.type === 'match'
  );

  return matches
    .map<GuideItem | null>((message) => createGuideItemFromMessage(message))
    .filter((d): d is GuideItem => d !== null)
    .sort((a, b) => a.step.localeCompare(b.step));
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
