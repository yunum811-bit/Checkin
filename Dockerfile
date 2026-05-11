FROM node:20-alpine

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy frontend and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY backend/ ./backend/

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "backend/src/index.js"]
