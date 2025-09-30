FROM mcr.microsoft.com/playwright:v1.47.2-jammy
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx playwright install --with-deps
ENV NODE_ENV=production
CMD ["node", "index.js"]