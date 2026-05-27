# CornGuard AI - Sistema de Identificación y Manejo de Enfermedades del Maíz

CornGuard AI es una aplicación full-stack interactiva y de alto rendimiento diseñada para la detección temprana de patógenos foliares en cultivos de maíz. El sistema emplea una red neuronal convolucional entrenada (guardada en formato Keras) para realizar diagnósticos instantáneos a partir de imágenes de hojas de maíz y proporciona literatura detallada sobre el control biológico, preventivo y químico almacenado en base de datos.

---

## 🚀 Características Principales

1. **Escáner Público de Hojas**: Permite a cualquier agricultor o técnico subir fotos o capturar imágenes en tiempo real (móvil/cámara) para obtener un diagnóstico con porcentajes de confianza en segundos.
2. **Inferencia Asíncrona Robusta**: Ejecución optimizada del modelo Keras reconstruido manualmente en el backend para evitar errores de deserialización de TensorFlow por diferencias de versión entre plataformas.
3. **Buzón de Información Dinámica**: La literatura, la sintomatología y el control biológico/cultural se obtienen dinámicamente y se validan mediante esquemas Pydantic que previenen campos en blanco o nulos.
4. **Cámara Web Nativa (HTML5)**: Integración de cámara nativa en navegadores web de escritorio a través de HTML5 `getUserMedia`, superando la limitación de Expo que abre el selector de archivos local.
5. **Notificaciones por Toasts**: Alertas personalizadas en el frontend mediante Toasts automatizados que eliminan los overlays bloqueantes de la consola del desarrollador web.
6. **Panel Administrativo Protegido (Admin)**: Módulo de autenticación segura por JWT con validación y limpieza de campos al guardar cambios de tratamientos.
7. **Dockerizado y Modular**: Configuración completa con Docker Compose para desarrollo local. En producción, el backend se despliega en Render, la base de datos en Supabase y el frontend en Vercel.
8. **Interfaz de Alto Impacto Visual**: UI responsive construida en Expo con un diseño orgánico premium, glassmorphism, degradados lineales y fondos con iluminación ambiental fluida.

---

## 🛠️ Requisitos de Software

Antes de iniciar, asegúrate de tener instalado en tu computadora:
- **Docker** y **Docker Compose** (solo necesario para desarrollo local)
- **Node.js** (v18 o superior, para ejecutar el frontend en desarrollo local)

---

## 📦 Desarrollo Local (Docker Compose)

Para levantar el backend y la base de datos PostgreSQL de manera automatizada en tu entorno local:

1. Abre tu terminal en la carpeta principal del proyecto (`CornModel`).
2. Levanta los contenedores ejecutando el siguiente comando:
   ```bash
   docker-compose up --build
   ```
3. Docker Compose realizará las siguientes acciones:
   - Descargará y configurará una base de datos **PostgreSQL 15 Alpine**.
   - Compilará la imagen de **FastAPI** cargando las dependencias científicas (TensorFlow CPU, NumPy, Pillow, SQLAlchemy, Alembic).
   - El script `entrypoint.sh` esperará activamente la conexión de la base de datos.
   - Ejecutará automáticamente las migraciones con Alembic (`alembic upgrade head`) para crear la estructura de tablas.
   - Sembrará automáticamente la cuenta del administrador y las informaciones predeterminadas para las clases `Blight`, `Common_Rust` y `Healthy`.
   - Expondrá la API REST en el puerto `http://localhost:8000`.

---

## 📱 Ejecución del Frontend (Expo React Native)

Para iniciar la aplicación móvil/web en tu entorno de desarrollo local:

1. Navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias del cliente (se requiere por primera vez):
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo de Expo:
   ```bash
   npm run start
   ```
4. **Opciones de Visualización**:
   - **Navegador Web**: Presiona `w` en la consola para abrir la versión responsive en tu navegador en `http://localhost:8081`.
   - **Dispositivo Físico**: Escanea el código QR que aparece en la terminal utilizando la aplicación **Expo Go** (disponible en Google Play y App Store).
   - **Emulador Android/iOS**: Presiona `a` para Android o `i` para iOS.

> [!TIP]
> **Configuración de IP para APK o Dispositivos Físicos (Local)**
> Si estás probando la aplicación en un celular físico o planeas compilar un archivo APK, edita el archivo `frontend/src/constants/config.ts` y cambia `localhost` por la dirección IP local de tu computadora (por ejemplo, `http://192.168.1.15:8000`) para que tu celular pueda comunicarse con el backend dockerizado.
>
> **En producción**, la URL del backend se configura mediante la variable de entorno `EXPO_PUBLIC_API_URL` definida en el panel de Vercel, sin necesidad de modificar el código fuente.

---

## 🔑 Credenciales del Administrador (Sembradas por Defecto)

Al iniciar el backend por primera vez, se crea automáticamente una cuenta única con los siguientes accesos (configurables en el archivo `.env`):
- **Usuario**: `admin`
- **Contraseña**: `adminpassword`

> [!IMPORTANT]
> **Seguridad y Archivo `.env`**
> El archivo `.env` que guarda las variables de configuración se encuentra excluido del rastreo en Git mediante el archivo `.gitignore` raíz para evitar la exposición accidental de secretos en producción. Crea tu archivo local copiando el ejemplo base:
> ```bash
> cp .env.example .env
> ```

---

## ☁️ Despliegue en Producción (Supabase + Render + Vercel)

La arquitectura de producción separa los tres componentes del sistema en servicios de nube gratuitos especializados:

| Componente | Servicio | Notas |
| :--- | :--- | :--- |
| **Base de Datos** | [Supabase](https://supabase.com/) | PostgreSQL gestionado. Usar la URL del **Connection Pooler** (puerto `6543`) para garantizar compatibilidad con IPv4. |
| **Backend (API)** | [Render](https://render.com/) | Desplegado como **Web Service** con runtime **Docker**, apuntando al directorio raíz `Backend`. |
| **Frontend (Web)** | [Vercel](https://vercel.com/) | Desplegado desde la rama `deploy`, directorio raíz `frontend`, compilado con `expo export -p web`. |

### Variables de Entorno requeridas en Render (Backend):

| Variable | Descripción |
| :--- | :--- |
| `DATABASE_URL` | URI del pooler de Supabase (sin caracteres especiales en la contraseña) |
| `JWT_SECRET` | Clave secreta larga y aleatoria para firmar los tokens JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Minutos de validez del token (recomendado: `120`) |
| `ADMIN_USERNAME` | Usuario administrador del panel |
| `ADMIN_PASSWORD` | Contraseña del administrador (sin caracteres especiales) |

### Variables de Entorno requeridas en Vercel (Frontend):

| Variable | Descripción |
| :--- | :--- |
| `EXPO_PUBLIC_API_URL` | URL pública del backend en Render (ej. `https://corn-backend.onrender.com`) |

> [!IMPORTANT]
> La contraseña de la base de datos de Supabase **no debe contener caracteres especiales** (`@`, `$`, `*`, `#`, `%`) ya que el parser de URLs de Alembic los interpreta como sintaxis de interpolación de ConfigParser, causando errores de conexión. Usar únicamente letras, números y guiones.

---

## 📊 Nombres de Clases y Diagnósticos

El modelo Keras analiza la imagen y la clasifica en una de las siguientes tres etiquetas:

1. **`Blight` (Tizón Foliar del Maíz)**: Causado por el hongo *Exserohilum turcicum*. Produce lesiones largas elípticas grisáceas. Favorecido por climas húmedos de 18°C a 27°C.
2. **`Common_Rust` (Roya Común)**: Causada por el hongo *Puccinia sorghi*. Genera pústulas circulares color ladrillo que liberan esporas por el haz y el envés. Prefiere temperaturas frescas de 16°C a 25°C.
3. **`Healthy` (Planta Sana)**: Hojas verdes uniformes y libres de clorosis. Indica un excelente estado de nutrición, espaciamiento y control del cultivo.

---

## 📜 Endpoints de la API REST

| Método | Ruta | Autenticación | Descripción |
| :--- | :--- | :---: | :--- |
| **POST** | `/api/predict` | Pública | Envía una imagen (`file`) en `multipart/form-data` para recibir el diagnóstico y su literatura. |
| **POST** | `/api/auth/login` | Pública | Recibe credenciales JSON y devuelve un token de portador JWT. |
| **GET** | `/api/classes` | Pública | Obtiene un arreglo con la información detallada de los 3 cultivos. |
| **GET** | `/api/classes/{class_name}` | Pública | Obtiene los detalles específicos de una sola clase foliar (`Blight`, `Common_Rust`, `Healthy`). |
| **PUT** | `/api/classes/{class_name}` | **JWT Requerido** | Actualiza la literatura de una clase (`Blight`, `Common_Rust`, `Healthy`). |
| **GET** | `/api/auth/me` | **JWT Requerido** | Valida el estado de la sesión activa del administrador. |
| **GET** | `/api/health` | Pública | Retorna un estado básico de salud de la API. |

---

## 📖 Documentación Interactiva (Swagger / OpenAPI)

La API cuenta con documentación interactiva estructurada y autogenerada para facilitar las pruebas y depuración del backend.

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Autenticación en Swagger UI
Para probar endpoints protegidos (como la actualización de literatura de plantas) directamente en Swagger UI:
1. Haz clic en el botón **Authorize** (candado verde) en la esquina superior derecha.
2. Introduce las credenciales administrativas (Usuario: `admin`, Contraseña: `adminpassword`).
3. Haz clic en **Authorize** y cierra la ventana emergente.
4. El token de sesión se guardará globalmente y se enviará de forma transparente en las cabeceras de todas tus peticiones en Swagger UI.

