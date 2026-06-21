# FilmSwiper

Тиндер для фильмов. Свайпайте карточки вместе с друзьями и находите фильм, который понравится всем.

## Структура проекта

```
film-swiper/
├── frontend/   # Next.js + TypeScript + Mantine
└── backend/    # Node.js + Express + Socket.io
```

## Быстрый старт

### 1. Получить API ключ TMDB

1. Зарегистрироваться на [themoviedb.org](https://www.themoviedb.org/)
2. Перейти в Settings → API → Request an API key
3. Скопировать **API Key (v3 auth)**

### 2. Бэкенд

```bash
cd backend
npm install

# Создать .env
cp .env.example .env
# Вставить TMDB_API_KEY в .env

npm run dev
# Сервер запустится на http://localhost:4000
```

### 3. Фронтенд

```bash
cd frontend
npm install

# Создать .env.local
cp .env.example .env.local
# NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

npm run dev
# Приложение на http://localhost:3000
```

## Деплой

### Frontend → Vercel
1. Пушим `frontend/` папку на GitHub
2. Подключаем репозиторий в [vercel.com](https://vercel.com)
3. Добавляем переменную: `NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app`

### Backend → Railway
1. Пушим `backend/` на GitHub
2. Создаём проект на [railway.app](https://railway.app)
3. Добавляем переменные: `TMDB_API_KEY`, `FRONTEND_URL=https://your-app.vercel.app`

## Socket.io события

| Событие | Кто | Описание |
|---|---|---|
| `create-room` | Клиент → Сервер | Создать комнату |
| `join-room` | Клиент → Сервер | Войти в комнату по ID |
| `update-settings` | Хост → Сервер | Обновить фильтры и порог матча |
| `start-session` | Хост → Сервер | Начать сессию |
| `swipe` | Клиент → Сервер | Свайп влево/вправо |
| `load-more-movies` | Хост → Сервер | Загрузить следующую страницу |
| `end-session` | Хост → Сервер | Завершить сессию |
| `room-updated` | Сервер → Клиенты | Обновление состояния комнаты |
| `movies-loaded` | Сервер → Клиенты | Список фильмов для сессии |
| `match` | Сервер → Клиенты | Найдено совпадение |
| `session-ended` | Сервер → Клиенты | Сессия завершена |
