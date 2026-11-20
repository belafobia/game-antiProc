import { useCallback, useState } from "react";

import { auth } from "./api";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";

// Portão de autenticação: com token, o app; sem token, o login.
// O token é só "provavelmente válido": se tiver vencido, a primeira chamada
// à API devolve 401 e a Home chama onLogout.
export default function App() {
  const [token, setToken] = useState(auth.get);

  const handleLogin = useCallback((newToken: string) => {
    auth.set(newToken);
    setToken(newToken);
  }, []);

  // useCallback: a Home usa onLogout como dependência do useEffect. Sem isso,
  // uma função nova a cada render faria o efeito (e a chamada /me) repetir.
  const handleLogout = useCallback(() => {
    auth.clear();
    setToken(null);
  }, []);

  return token ? <Home onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}
