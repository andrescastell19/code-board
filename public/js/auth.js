// auth.js
// Función reutilizable para login
function loginRequest(user, pass) {
  return fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ user, pass }),
  });
}
