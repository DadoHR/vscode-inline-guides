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

  constructor(step: GuideStep, workspacePath: string) {
    super(step.step, vscode.TreeItemCollapsibleState.None);
    this.description = step.name;
    this.step = step;
    this.resourceUri = vscode.Uri.file(
      `${workspacePath}/${step.location.filePath}`
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
  #workspacePaths: string[];

  readonly onDidChangeTreeData: vscode.Event<
    GuideTreeItem | undefined | null | void
  > = this.#onDidChangeTreeData.event;

  constructor(workspacePaths: string[]) {
    this.#workspacePaths = workspacePaths;
  }

  async getChildren(element?: GuideTreeGuideItem): Promise<GuideTreeItem[]> {
    if (this.#workspacePaths.length === 0) {
      const ACTION_OPEN_FOLDER = 'Open folder';

      const result = await vscode.window.showInformationMessage(
        'Can’t find guides in an empty workspace!',
        ACTION_OPEN_FOLDER
      );

      if (result === ACTION_OPEN_FOLDER) {
        vscode.commands.executeCommand('vscode.openFolder');
      }
      return [];
    }

    if (element) {
      return Object.values(element.guide.steps).map((step) => {
        return new GuideTreeStepItem(step, element.guide.workspacePath);
      });
    }

    const guides = (
      await Promise.all(
        this.#workspacePaths.map((workspacePath) => getGuides(workspacePath))
      )
    ).flat();

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

export function activate(context: vscode.ExtensionContext) {
  const inlineGuidesProvider = new InlineGuidesProvider(
    vscode.workspace.workspaceFolders?.map(
      (workspaceFolder) => workspaceFolder.uri.fsPath
    ) ?? []
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'inlineGuides.openStep',
      async (step: GuideStep) => {
        const uri = vscode.Uri.file(step.location.filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(step.location.lineNumber, 0);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter
        );
      }
    ),

    vscode.commands.registerCommand('inlineGuides.reload', () =>
      inlineGuidesProvider.reload()
    ),

    vscode.window.registerTreeDataProvider('inlineGuides', inlineGuidesProvider)
  );

  vscode.workspace.onDidSaveTextDocument(() => inlineGuidesProvider.reload());
}
