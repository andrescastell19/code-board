let editor;
let socket;

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
      // const obj = await res.json();
      // if (obj.user === "dev") {
      //   document.getElementById("run").style.display = "none";
      //   document.getElementById("errors").style.display = "none";
      // }
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
    });

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") editor.setValue(data.code);
      else if (data.type === "code" && editor.getValue() !== data.code)
        editor.setValue(data.code);
      else if (data.type === "output")
        document.getElementById("output").textContent = data.output;
    };

    editor.onDidChangeModelContent(() => {
      const code = editor.getValue();
      socket.send(JSON.stringify({ type: "code", code }));
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
