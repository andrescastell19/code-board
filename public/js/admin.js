

import { createMonacoEditor, setupEditorEvents, handleSocketMessages } from './editorCommon.js';

let editor;
let socket;
let adminEditing = false;
let devEditing = false;

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

    // Botón de bloqueo solo para admin
    let lockBtn = document.createElement('button');
    lockBtn.id = 'lock-btn';
    lockBtn.textContent = 'Bloquear edición DEV';
    lockBtn.style = 'padding:10px;background:#c00;color:#fff;border:none;cursor:pointer;margin:10px;';
    lockBtn.onclick = function () {
      adminEditing = !adminEditing;
      state.adminEditing = adminEditing;
      socket.send(JSON.stringify({ type: "admin_editing", editing: adminEditing }));
      updateLockBtn();
      if (!adminEditing) {
        const code = editor.getValue();
        socket.send(JSON.stringify({ type: "code", code }));
      }
    };
    document.body.insertBefore(lockBtn, document.getElementById("editor"));
    function updateLockBtn() {
      lockBtn.textContent = adminEditing ? 'Desbloquear edición DEV' : 'Bloquear edición DEV';
      lockBtn.style.background = adminEditing ? '#888' : '#c00';
    }

    // Estado compartido
    const state = { adminEditing, devEditing };

    function updateEditorLock() {
      if (state.devEditing && !state.adminEditing) {
        editor.updateOptions({ readOnly: true });
        editor.getContainerDomNode().style.opacity = 0.7;
      } else {
        editor.updateOptions({ readOnly: false });
        editor.getContainerDomNode().style.opacity = 1;
      }
    }

    handleSocketMessages(editor, socket, state, updateEditorLock, 'admin');
    setupEditorEvents(editor, socket, () => state.adminEditing, v => { state.adminEditing = v; }, 'admin');

    let syncTimeout = null;
    editor.onDidChangeModelContent(() => {
      if (state.devEditing && !state.adminEditing) return;
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const code = editor.getValue();
        socket.send(JSON.stringify({ type: "code", code }));
      }, 400);
    });
  });
});
