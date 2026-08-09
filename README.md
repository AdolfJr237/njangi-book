# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Backend database migrations

NjangiBook uses PostgreSQL locally. The connection string lives only in
`backend/.env` (which is gitignored); the backend and Alembic both read its
`DATABASE_URL` value.

From `backend/`, apply the schema required by the current code before starting
the API:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

After intentionally changing a SQLAlchemy model, create a reviewed migration,
then apply it:

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe the change"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

`alembic revision --autogenerate` is a draft generator, not an automatic
approval: inspect the generated file in `backend/alembic/versions/` before
running `upgrade head`. Use `alembic current` to see the installed revision
and `alembic check` to detect model changes that do not yet have a migration.

## Backend environment safety

Local development uses `APP_ENVIRONMENT=development`, where `CORS_ORIGINS=*`
is acceptable for simple local web testing. Before deployment, set
`APP_ENVIRONMENT=production` and provide a PostgreSQL URL, a unique 32+-character
`SECRET_KEY`, explicit HTTPS `CORS_ORIGINS`, and a real SMS provider. The API
intentionally refuses to start if any of those production safeguards are missing.

`GET /health` confirms that both the API and its configured database are
reachable. It is suitable for a hosting platform health check.
