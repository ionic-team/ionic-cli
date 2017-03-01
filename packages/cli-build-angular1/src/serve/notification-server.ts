// Ionic Dev Server: Server Side Logger
import { BuildUpdateMessage, WsMessage } from '../util/interfaces';
import { Logger } from '../logger/logger';
import { generateRuntimeDiagnosticContent } from '../logger/logger-runtime';
import { hasDiagnostics, getDiagnosticsHtmlContent } from '../logger/logger-diagnostics';
import { on, EventType } from '../util/events';
import { Server as WebSocketServer } from 'ws';
import { ServeConfig } from './serve-config';


export function createNotificationServer(config: ServeConfig) {
  let wsServer: any;
  const msgToClient: WsMessage[] = [];

  // queue up all messages to the client
  function queueMessageSend(msg: WsMessage) {
    msgToClient.push(msg);
    drainMessageQueue({
      broadcast: true
    });
  }

  // drain the queue messages when the server is ready
  function drainMessageQueue(options = { broadcast: false }) {
    let sendMethod = wsServer && wsServer.send;
    if (options.hasOwnProperty('broadcast') && options.broadcast) {
      sendMethod = wss.broadcast;
    }
    if (sendMethod && wss.clients.length > 0) {
      let msg: any;
      while (msg = msgToClient.shift()) {
        try {
          sendMethod(JSON.stringify(msg));
        } catch (e) {
          if (e.message !== 'not opened' && e.message !== `Cannot read property 'readyState' of undefined`) {
            Logger.error(`error sending client ws - ${e.message}`);
          }
        }
      }
    }
  }

  // a build update has started, notify the client
  on(EventType.BuildUpdateStarted, (buildUpdateMsg: BuildUpdateMessage) => {
    const msg: WsMessage = {
      category: 'buildUpdate',
      type: 'started',
      data: {
        buildId: buildUpdateMsg.buildId,
        reloadApp: buildUpdateMsg.reloadApp,
        diagnosticsHtml: null
      }
    };
    queueMessageSend(msg);
  });

  // a build update has completed, notify the client
  on(EventType.BuildUpdateCompleted, (buildUpdateMsg: BuildUpdateMessage) => {
    const msg: WsMessage = {
      category: 'buildUpdate',
      type: 'completed',
      data: {
        buildId: buildUpdateMsg.buildId,
        reloadApp: buildUpdateMsg.reloadApp,
        diagnosticsHtml: hasDiagnostics(config.buildDir) ? getDiagnosticsHtmlContent(config.buildDir) : null
      }
    };
    queueMessageSend(msg);
  });

  // create web socket server
  const wss = new WebSocketServer({ port: config.notificationPort });
  wss.broadcast = function broadcast(data: any) {
    wss.clients.forEach(function each(client: any) {
      client.send(data);
    });
  };
  wss.on('connection', (ws: any) => {
    // we've successfully connected
    wsServer = ws;

    wsServer.on('message', (incomingMessage: string) => {
      // incoming message from the client
      try {
        printMessageFromClient(JSON.parse(incomingMessage));
      } catch (e) {
        Logger.error(`error opening ws message: ${incomingMessage}`);
      }
    });

    // now that we're connected, send off any messages
    // we might has already queued up
    drainMessageQueue();
  });


  function printMessageFromClient(msg: WsMessage) {
    if (msg && msg.data) {
      switch (msg.category) {
        case 'console':
          printConsole(msg);
          break;

        case 'runtimeError':
          handleRuntimeError(msg);
          break;
      }
    }
  }


  function printConsole(msg: WsMessage) {
    const args = msg.data;
    args[0] = `console.${msg.type}: ${args[0]}`;

    switch (msg.type) {
      case 'error':
        Logger.error.apply(this, args);
        break;

      case 'warn':
        Logger.warn.apply(this, args);
        break;

      case 'debug':
        Logger.debug.apply(this, args);
        break;

      default:
        Logger.info.apply(this, args);
        break;
      }
  }


  function handleRuntimeError(clientMsg: WsMessage) {
    const msg: WsMessage = {
      category: 'buildUpdate',
      type: 'completed',
      data: {
        diagnosticsHtml: generateRuntimeDiagnosticContent(config.rootDir,
                                                          config.buildDir,
                                                          clientMsg.data.message,
                                                          clientMsg.data.stack)
      }
    };
    queueMessageSend(msg);
  }
}
