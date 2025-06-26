// Funciones y lógica compartida para admin y dev

export function createMonacoEditor(cb) {
  require.config({
    paths: { vs: "https://unpkg.com/monaco-editor@latest/min/vs" },
  });
  require(["vs/editor/editor.main"], cb);
}

export function setupEditorEvents(editor, socket, getEditingState, setEditingState, role) {
  // Sincronización de errores
  editor.onDidChangeModelDecorations(() => {
    const markers = monaco.editor.getModelMarkers({ resource: editor.getModel().uri }) || [];
    document.getElementById("errors").innerHTML = markers
      .map((m) => `${m.message} (línea ${m.startLineNumber})`)
      .join("<br>");
  });

  // Botón de ejecución
  document.getElementById("run").onclick = () => {
    const code = editor.getValue();
    socket.send(JSON.stringify({ type: "run", code }));
  };
}

export function handleSocketMessages(editor, socket, state, updateEditorLock, role) {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "init") {
      editor.setValue(data.code);
    } else if (data.type === "code" && editor.getValue() !== data.code) {
      const selection = editor.getSelection();
      editor.setValue(data.code);
      if (!state.adminEditing && !state.devEditing) editor.setSelection(selection);
    } else if (data.type === "output") {
      document.getElementById("output").textContent = data.output;
    } else if (data.type === "admin_editing") {
      state.adminEditing = data.editing;
      updateEditorLock();
    } else if (data.type === "dev_editing") {
      state.devEditing = data.editing;
      updateEditorLock();
    }
  };
}
