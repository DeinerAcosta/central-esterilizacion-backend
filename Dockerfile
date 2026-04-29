# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependencias y esquemas de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las dependencias (incluyendo dev) para poder compilar
RUN npm install

# Generar el cliente de Prisma
RUN npx prisma generate

# Copiar el código fuente y compilar TypeScript
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:18-alpine

WORKDIR /app

# Solo copiamos los archivos de producción
COPY package*.json ./
COPY prisma ./prisma/

# Instalamos solo dependencias de producción
RUN npm install --omit=dev
RUN npx prisma generate

# Copiamos la carpeta compilada desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Crear la carpeta de uploads para evitar errores de permisos
RUN mkdir -p uploads/evidencias

EXPOSE 3000

# Comando para iniciar la app compilada
CMD ["node", "dist/app.js"]