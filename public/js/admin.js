
let editor;
let socket;
let adminEditing = false;

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

    let lockBtn = document.createElement('button');
    lockBtn.id = 'lock-btn';
    lockBtn.textContent = 'Bloquear edición DEV';
    lockBtn.style = 'padding:10px;background:#c00;color:#fff;border:none;cursor:pointer;margin:10px;';
    lockBtn.onclick = function () {
      adminEditing = !adminEditing;
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

    let devEditing = false;
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
      // El editor de admin solo se deshabilita si dev está editando y admin NO está editando
      if (devEditing && !adminEditing) {
        editor.updateOptions({ readOnly: true });
        editor.getContainerDomNode().style.opacity = 0.7;
      } else {
        editor.updateOptions({ readOnly: false });
        editor.getContainerDomNode().style.opacity = 1;
      }
    }

    let syncTimeout = null;
    editor.onDidChangeModelContent(() => {
      // Si dev está editando y admin NO está editando, bloquear edición
      if (devEditing && !adminEditing) return;
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
