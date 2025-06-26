let editor;
let socket;

let isAdmin = false;
let adminEditing = false;
let currentUser = null;

function login() {
  const user = document.getElementById("user").value;
  const pass = document.getElementById("pass").value;

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ user, pass }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Login inválido");
      document.getElementById("login").style.display = "none";
      const obj = await res.json();
      currentUser = obj.user;
      isAdmin = obj.user === "admin";
      if (obj.user === "dev") {
        document.getElementById("run").style.display = "none";
        document.getElementById("errors").style.display = "none";
      }
      initEditor();
    })
    .catch((err) => alert(err.message));
}

function initEditor() {
  socket = new WebSocket(`wss://${location.host}`);
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

    // Botón de bloqueo solo para admin
    if (isAdmin) {
      let lockBtn = document.createElement('button');
      lockBtn.id = 'lock-btn';
      lockBtn.textContent = 'Bloquear edición DEV';
      lockBtn.style = 'padding:10px;background:#c00;color:#fff;border:none;cursor:pointer;margin:10px;';
      lockBtn.onclick = function () {
        adminEditing = !adminEditing;
        socket.send(JSON.stringify({ type: "admin_editing", editing: adminEditing }));
        updateLockBtn();
        // Si se desbloquea, sincroniza el código actual con todos
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
    }

    // Flag para saber si el dev está editando
    let devEditing = false;
    let devEditTimeout = null;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        editor.setValue(data.code);
      } else if (data.type === "code" && editor.getValue() !== data.code) {
        // Save current selection
        const selection = editor.getSelection();
        editor.setValue(data.code);
        // Try to restore selection if editor is not readOnly
        if (!editor.getOption && !adminEditing) {
          editor.setSelection(selection);
        } else if (!adminEditing) {
          editor.setSelection(selection);
        }
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
      // Si el admin bloquea, el dev no puede editar
      if (!isAdmin && adminEditing) {
        editor.updateOptions({ readOnly: true });
        editor.getContainerDomNode().style.opacity = 0.7;
      // Si el dev está editando, el admin no puede editar
      } else if (isAdmin && devEditing) {
        editor.updateOptions({ readOnly: true });
        editor.getContainerDomNode().style.opacity = 0.7;
      } else {
        editor.updateOptions({ readOnly: false });
        editor.getContainerDomNode().style.opacity = 1;
      }
    }

    // Debounce para sincronización de cambios
    let syncTimeout = null;
    editor.onDidChangeModelContent(() => {
      // Si el dev está editando, notificar a todos (incluido el admin)
      if (!isAdmin) {
        devEditing = true;
        socket.send(JSON.stringify({ type: "dev_editing", editing: true }));
        clearTimeout(devEditTimeout);
        devEditTimeout = setTimeout(() => {
          devEditing = false;
          socket.send(JSON.stringify({ type: "dev_editing", editing: false }));
          updateEditorLock();
        }, 1200); // 1.2s sin escribir = dev deja de editar
      }
      // Solo sincroniza si NO es admin con bloqueo activo y NO es admin bloqueado por dev
      if ((isAdmin && adminEditing) || (isAdmin && devEditing)) {
        // No sincronizar mientras el admin está editando o dev está editando
        return;
      }
      // Si es admin y desbloquea, o si es dev, sincroniza con debounce
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const code = editor.getValue();
        socket.send(JSON.stringify({ type: "code", code }));
      }, 400); // 400ms debounce
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
