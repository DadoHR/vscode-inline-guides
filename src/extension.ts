import * as vscode from 'vscode';
import { Guide, GuideStep, getGuideTree, getGuides } from './lib/guide.js';

class GuideTreeGuideItem extends vscode.TreeItem {
  guide: Guide;

  constructor(guide: Guide) {
    super(guide.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.guide = guide;
  }
}

class GuideTreeStepItem extends vscode.TreeItem {
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

type GuideTreeItem = GuideTreeGuideItem | GuideTreeStepItem;

export class InlineGuidesProvider
  implements vscode.TreeDataProvider<GuideTreeItem>
{
  #onDidChangeTreeData: vscode.EventEmitter<
    GuideTreeItem | undefined | null | void
  > = new vscode.EventEmitter<GuideTreeItem | undefined | null | void>();
  #workspaceRoot: string;

  readonly onDidChangeTreeData: vscode.Event<
    GuideTreeItem | undefined | null | void
  > = this.#onDidChangeTreeData.event;

  constructor(workspaceRoot: string) {
    this.#workspaceRoot = workspaceRoot;
  }

  async getChildren(element?: GuideTreeGuideItem): Promise<GuideTreeItem[]> {
    if (element) {
      return Object.values(element.guide.steps).map(
        (step) => new GuideTreeStepItem(step, this.#workspaceRoot)
      );
    }

    const guides = await getGuides(this.#workspaceRoot);
    const guideTree = getGuideTree(guides);
    return Object.values(guideTree).map(
      (guide) => new GuideTreeGuideItem(guide)
    );
  }

  getTreeItem(element: GuideTreeGuideItem): vscode.TreeItem {
    return element;
  }

  reload(): void {
    this.#onDidChangeTreeData.fire();
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

  const inlineGuidesProvider = new InlineGuidesProvider(rootPath);

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
  vscode.commands.registerCommand('inlineGuides.reload', () =>
    inlineGuidesProvider.reload()
  );

  vscode.workspace.onDidSaveTextDocument(() => inlineGuidesProvider.reload());

  vscode.window.registerTreeDataProvider('inlineGuides', inlineGuidesProvider);
}
