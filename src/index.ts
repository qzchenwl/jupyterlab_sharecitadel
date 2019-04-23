import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ToolbarButton, ICommandPalette, showDialog
} from '@jupyterlab/apputils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  NotebookPanel, INotebookModel, INotebookTracker
} from '@jupyterlab/notebook';
import { ServerConnection } from '@jupyterlab/services';
import { URLExt } from '@jupyterlab/coreutils';


/**
 * The plugin registration information.
 */
const plugin: JupyterLabPlugin<void> = {
  requires: [ICommandPalette, INotebookTracker],
  activate,
  id: 'jupyterlab_sharecitadel',
  autoStart: true
};

/**
 * Activate the extension.
 */
function activate(app: JupyterLab, palette: ICommandPalette, tracker: INotebookTracker) {
  Private.addCommands(app, palette, tracker);
  app.docRegistry.addWidgetExtension('Notebook', new Private.ShareCitadelExtension(app));
};

namespace Private {
  const command = 'meituan:share-citadel';
  const category = 'Meituan';
  const serverSettings = ServerConnection.makeSettings();

  // function shareCitadel(notebookPath: String): Promise<any> {
  //   return fetch('/meituan/share-citadel').then(r => r.json());
  // }

  export function addCommands(app: JupyterLab, palette: ICommandPalette, tracker: INotebookTracker): void {

    app.commands.addCommand(command, {
      label: 'Share Citadel',
      execute: () => {
        const current = tracker.currentWidget;
        const path = current.context.path;
        showDialog({
          title: '分享到学城',
          body: `是否将 ${path} 分享到学城？`
        }).then(result => {
          if (!result.button.accept) {
            return;
          }

          const url = URLExt.join(serverSettings.baseUrl, 'meituan/share-citadel')
          const body = JSON.stringify({ path });
          const { context } = current;

          ((context.model.dirty && !context.model.readOnly) ? context.save() : Promise.resolve())
          .then(() => ServerConnection.makeRequest(url, {method: 'POST', body}, serverSettings))
          .then(response => {
            if (!response.ok) {
              throw new ServerConnection.ResponseError(response);
            }
            return response.json();
          })
          .then(result => window.open(result.pageUrl, '_blank'))
          .catch(err => {
              err.response.json().then((r:any) => showDialog({title: '分享失败', body: r.message}));
          })
        });
      }
    });

    palette.addItem({command, category});
  }

  /**
   * A notebook widget extension that adds a button to the toolbar.
   */
  export class ShareCitadelExtension implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
    constructor(private app: JupyterLab) {}

    /**
     * Create a new extension object.
     */
    createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {

      let callback = () => {
        this.app.commands.execute(command)
      };

      let button = new ToolbarButton({
        iconClassName: 'fa fa-share-alt',
        onClick: callback,
        tooltip: '共享到学城'
      });

      panel.toolbar.insertItem(0, 'shareCitadel', button);

      return new DisposableDelegate(() => {
        button.dispose();
      });
    }
  }
}
/**
 * Export the plugin as default.
 */
export default plugin;
