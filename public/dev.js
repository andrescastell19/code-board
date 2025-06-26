
let editor;
let socket;
let devEditing = false;

window.addEventListener('DOMContentLoaded', () => {
  initEditor();
});

function initEditor() {
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${wsProtocol}://${location.host}`);
  require.config({
    paths: { vs: "https://unpkg.com/monaco-editor@latest/min/vs" },
  });
  require(["vs/editor/editor.main"], function () {
    editor = monaco.editor.create(document.getElementById("editor"), {
      value: "",
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      readOnly: false,
    });

    let adminEditing = false;
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        editor.setValue(data.code);
      } else if (data.type === "code" && editor.getValue() !== data.code) {
        const selection = editor.getSelection();
        editor.setValue(data.code);
        if (!adminEditing && !devEditing) editor.setSelection(selection);
      } else if (data.type === "output") {
        document.getElementById("output").textContent = data.output;
      } else if (data.type === "admin_editing") {
        adminEditing = data.editing;
        updateEditorLock();
      } else if (data.type === "dev_editing") {
        devEditing = data.editing;
        updateEditorLock();
      }
    };

    function updateEditorLock() {
      // El editor de dev se deshabilita siempre que admin está editando
      if (adminEditing) {
        editor.updateOptions({ readOnly: true });
        editor.getContainerDomNode().style.opacity = 0.7;
      } else {
        editor.updateOptions({ readOnly: false });
        editor.getContainerDomNode().style.opacity = 1;
      }
    }

    let syncTimeout = null;
    let devEditTimeout = null;
    editor.onDidChangeModelContent(() => {
      // Si admin está editando, bloquear edición de dev
      if (adminEditing) return;
      if (!devEditing) {
        devEditing = true;
        socket.send(JSON.stringify({ type: "dev_editing", editing: true }));
      }
      clearTimeout(devEditTimeout);
      devEditTimeout = setTimeout(() => {
        devEditing = false;
        socket.send(JSON.stringify({ type: "dev_editing", editing: false }));
        updateEditorLock();
      }, 1200);
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const code = editor.getValue();
        socket.send(JSON.stringify({ type: "code", code }));
      }, 400);
    });

    editor.onDidChangeModelDecorations(() => {
      const markers =
        monaco.editor.getModelMarkers({ resource: editor.getModel().uri }) ||
        [];
      document.getElementById("errors").innerHTML = markers
        .map((m) => `${m.message} (línea ${m.startLineNumber})`)
        .join("<br>");
    });

    document.getElementById("run").onclick = () => {
      const code = editor.getValue();
      socket.send(JSON.stringify({ type: "run", code }));
    };
  });
}
