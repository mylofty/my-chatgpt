# 构建单纯服务端的运行镜像
FROM node:lts-alpine

# 设置工作目录
WORKDIR /app

COPY ./package.json /app
COPY ./pnpm-lock.yaml /app

RUN npm install pnpm -g

RUN pnpm install

COPY . /app

RUN pnpm run build

EXPOSE 3000

CMD [ "pnpm", "run", "prod"]