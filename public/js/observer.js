import { createMonacoEditor, handleSocketMessages } from './editorCommon.js';

let editor;
let socket;

window.addEventListener('DOMContentLoaded', () => {
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${wsProtocol}://${location.host}`);
  createMonacoEditor(() => {
    editor = monaco.editor.create(document.getElementById("editor"), {
      value: "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      readOnly: true,
    });

    // Estado ficticio para compatibilidad con handleSocketMessages
    const state = { adminEditing: false, devEditing: false };
    function updateEditorLock() {
      editor.updateOptions({ readOnly: true });
      editor.getContainerDomNode().style.opacity = 0.7;
    }
    handleSocketMessages(editor, socket, state, updateEditorLock, 'observer');
  });
});
