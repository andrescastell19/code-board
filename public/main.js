// main.js: gestiona el login y redirige según el rol
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
      const obj = await res.json();
      if (obj.user === "admin") {
        window.location.href = "admin.html";
      } else if (obj.user === "dev") {
        window.location.href = "dev.html";
      } else {
        alert("Rol desconocido");
      }
    })
    .catch((err) => alert(err.message));
}
