import * as vscode from 'vscode';
import { Guide, GuideStep, getGuideTree, getGuides } from './lib/guide.js';

class GuideTreeItem extends vscode.TreeItem {
  guide: Guide;

  constructor(guide: Guide) {
    super(guide.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.guide = guide;
  }
}

class GuideStepTreeItem extends vscode.TreeItem {
  step: GuideStep;

  constructor(step: GuideStep, workspaceRoot: string) {
    super(step.step, vscode.TreeItemCollapsibleState.None);
    this.description = step.name;
    this.step = step;
    this.resourceUri = vscode.Uri.file(
      `${workspaceRoot}/${step.location.filePath}`
    );

    this.command = {
      title: 'Open',
      command: 'inlineGuides.openStep',
      arguments: [step]
    };
  }
}

export class InlineGuidesProvider
  implements vscode.TreeDataProvider<GuideTreeItem | GuideStepTreeItem>
{
  #workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.#workspaceRoot = workspaceRoot;
  }

  async getChildren(
    element?: GuideTreeItem
  ): Promise<(GuideTreeItem | GuideStepTreeItem)[]> {
    if (element) {
      return Object.values(element.guide.steps).map(
        (step) => new GuideStepTreeItem(step, this.#workspaceRoot)
      );
    }

    const guideTree = getGuideTree(await getGuides(this.#workspaceRoot));
    return Object.values(guideTree).map((guide) => new GuideTreeItem(guide));
  }

  getTreeItem(element: GuideTreeItem): vscode.TreeItem {
    return element;
  }
}

export function activate() {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  if (!rootPath) {
    return;
  }

  vscode.commands.registerCommand(
    'inlineGuides.openStep',
    async (step: GuideStep) => {
      const uri = vscode.Uri.file(`${rootPath}/${step.location.filePath}`);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      const pos = new vscode.Position(step.location.lineNumber, 0);
      editor.revealRange(
        new vscode.Range(pos, pos),
        vscode.TextEditorRevealType.InCenter
      );
    }
  );

  vscode.window.registerTreeDataProvider(
    'inlineGuides',
    new InlineGuidesProvider(rootPath)
  );
}
