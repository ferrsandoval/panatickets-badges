# Subir el proyecto a GitHub (para conectar con Vercel)

El repositorio local ya está listo (commit hecho). Solo falta crear el repo en GitHub y hacer push.

---

## 1. Crear el repositorio en GitHub

1. Entra en **https://github.com** e inicia sesión (o crea una cuenta).
2. Haz clic en **+** (arriba derecha) → **New repository**.
3. **Repository name:** `panatickets-badges` (o el nombre que quieras).
4. **Public**.
5. **No** marques "Add a README", "Add .gitignore" ni "Choose a license" (el proyecto ya tiene todo).
6. Haz clic en **Create repository**.

---

## 2. Conectar y subir desde tu PC

En la terminal, desde la carpeta del proyecto (`c:\EasyDevs\panatickets-badges`):

```bash
git remote add origin https://github.com/TU_USUARIO/panatickets-badges.git
git push -u origin main
```

Sustituye **TU_USUARIO** por tu usuario de GitHub (ej. si tu perfil es `github.com/fernandodejesuss2`, usa `fernandodejesuss2`).

Si GitHub te pide **usuario y contraseña:**
- La contraseña ya no se usa; necesitas un **Personal Access Token**.
- En GitHub: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. Marca al menos **repo**. Copia el token.
- Cuando `git push` pida contraseña, pega el **token** (no tu contraseña de GitHub).

---

## 3. Conectar con Vercel

1. Entra en **https://vercel.com** → **Add New** → **Project**.
2. Elige **Import Git Repository** y conecta GitHub si aún no está.
3. Selecciona el repo **panatickets-badges**.
4. Sigue los pasos de **docs/DEPLOY_VERCEL_PASO_A_PASO.md** (Storage/Postgres, WEBHOOK_SECRET, Deploy, dominio).
