# 第一步，先使用node环境，编译出dist文件夹用于部署
# build front-end 
FROM node:lts-alpine AS frontend
RUN npm install pnpm -g
WORKDIR /app
COPY ./package.json /app
COPY ./pnpm-lock.yaml /app
RUN pnpm install
COPY . /app
RUN pnpm run build

# 第二步，将上一步输出的dist部署在nignx中
FROM nginx:latest
# 将第一步的dist保存到nignx中
COPY --from=frontend /app/dist /usr/share/nginx/html/
# 配置nginx的配置文件，暴露出80端口
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80