

import { createMonacoEditor, setupEditorEvents, handleSocketMessages } from './editorCommon.js';

let editor;
let socket;
let devEditing = false;
let adminEditing = false;

window.addEventListener('DOMContentLoaded', () => {
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${wsProtocol}://${location.host}`);
  createMonacoEditor(() => {
    editor = monaco.editor.create(document.getElementById("editor"), {
      value: "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      readOnly: false,
    });

    // Estado compartido
    const state = { adminEditing, devEditing };

    function updateEditorLock() {
      if (state.adminEditing) {
        editor.updateOptions({ readOnly: true });
        editor.getContainerDomNode().style.opacity = 0.7;
      } else {
        editor.updateOptions({ readOnly: false });
        editor.getContainerDomNode().style.opacity = 1;
      }
    }

    handleSocketMessages(editor, socket, state, updateEditorLock, 'dev');
    setupEditorEvents(editor, socket, () => state.devEditing, v => { state.devEditing = v; }, 'dev');

    let syncTimeout = null;
    let devEditTimeout = null;
    editor.onDidChangeModelContent(() => {
      if (state.adminEditing) return;
      if (!state.devEditing) {
        state.devEditing = true;
        socket.send(JSON.stringify({ type: "dev_editing", editing: true }));
      }
      clearTimeout(devEditTimeout);
      devEditTimeout = setTimeout(() => {
        state.devEditing = false;
        socket.send(JSON.stringify({ type: "dev_editing", editing: false }));
        updateEditorLock();
      }, 1200);
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const code = editor.getValue();
        socket.send(JSON.stringify({ type: "code", code }));
      }, 400);
    });
  });
});
