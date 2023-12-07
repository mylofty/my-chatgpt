
## 环境搭建
1. 安装nvm
```
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```
2. 使用nvm来安装nodejs，可以执行`nvm`来查看支持的命令
```
nvm install v17.0.0
```
3. 安装typescript
```shell
npm install -g typescript
# tsc -v
```

## 创建service工程
### service环境搭建
1. 创建service目录
```
mkdir service
cd service
```
1. 初始化
```shell
pnpm init
```
init之后会生成配置文件package.json，用于管理项目
2. 配置eslint代码检查工具
```shell
pnpm i --save-dev eslint
npx eslint --init
# 注：npx 表示从当前路径下查找命令，即 ./node_modules/.bin/eslint --init
```
2. 配置typescript
```shell
# pnpm install typescript
tsc --init
```
可以通过配置tsconfig.json来调节vscode类型报错等问题，如是否严格检查类型`"struct":false`
3. 创建express服务
```
pnpm install express
```
4. 配置代码提示
```
pnpm i --save-dev @types/node
pnpm i --save-dev @types/express
```
5. 编写src/index.js demo
```js
import express from 'express'
const app = express()
var port = 3000
app.get('/',(req, rsp)=>{
  rsp.send('hello world123')
})
app.listen(port, ()=>{
 console.log('success 123')
})
```
这是一个简单的输出，若是需要解析出请求字段，则需加入如下逻辑：
- 1. 请求端加入content-type为application/json
- 2. 服务端加入解析参数的中间件代码：`app.use(express.json())`，该方法会将参数解析为json对象
- 3. post接口中获取参数`console.log('verify reqbody:',req.body)`
5. 运行ts代码

一般方法【勿用】
```shell
# 1. 可以将ts编译成js，然后运行
tsc src/index.ts
node src/index.js
# 1. 可使用ts-node来运行ts文件 pnpm install -g typescript ts-node
ts-node src/index.ts
# package.json新增启动脚本 pnpm install ts-node-dev
"scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/app.ts"
}
```
**使用esno配置化**
```shell
# 安装esno
pnpm install esno
# package.json中配置 esno来运行
"scripts": {
  "start": "esno ./src/index.ts",
  "dev": "esno watch ./src/index.ts",
}
```
启动项目
```shell
pnpm start
```

### service使用环境变量.env文件作为环境变量
DotEnv 是一个轻量级的 npm 包，它可以从 .env 文件中自动加载环境变量到 process.env 对象。
```shell
pnpm install dotenv
```
service目录下面创建env文件
```shell
# .env
AUTH_SECRET_KEY=12345
```
index.ts中变可以使用
```shell
# index.ts
import * as dotenv from 'dotenv'
dotenv.config({path:'.env'}) # 通过配置path替换默认，可以分正式和测试
console.log('env is', process.env.AUTH_SECRET_KEY)
```
### service服务打包
安装打包工具
```shell
pnpm install --save-dev rimraf
pnpm install --save-dev tsup
pnpm install --save-dev node-fetch
```
配置打包文件tsup.config.ts
```javascript
// service/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'build',
  target: 'es2020',
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  dts: false,
})
```
配置打包命令到package.json中
```shell
  "scripts": {
    "start": "esno ./src/index.ts",
    "dev": "esno watch ./src/index.ts",
    "build": "pnpm clean && tsup",
    "prod": "node ./build/index.mjs",
    "clean": "rimraf build",
  }
```
打包生成build文件并运行
```shell
pnpm run build
pnpm run prod
```

### 创建docker镜像
在service目录下创建dockerfile
```dockerfile

```
构建镜像
```shell
docker build -t my-service .
```

运行镜像
```
docker run --name gpt-service --rm -it -p 3000:3000 --env OPENAI_API_KEY=your_api_key my-service
```

## 创建web工程
### 使用vite搭建项目
```shell
pwd
# my-chatgpt根目录
pnpm create vite
# 创建vue项目web
cd web
pnpm install
# pnpm run dev
```
### 配置环境
```shell
pnpm install @types/node --save-dev
```
针对main.ts引入Vue报错：找不到模块“./App.vue”或其相应的类型声明
```javascript
// vite-env.d.ts文件中加入如下代码
declare module '*.vue' {
  import { defineComponent } from 'vue'
  const Component: ReturnType<typeof defineComponent>
  export default Component
}
```
使用环境变量配置，web目录下增加一个`.env`文件
```shell
# Glob API URL
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=http://127.0.0.1:3002/
```
之后再`vite.config.ts`中引入
```js
import { defineConfig,loadEnv } from 'vite'
const viteEnv = loadEnv(env.mode, process.cwd()) as unknown as ImportMetaEnv
# 直接使用`viteEnv.VITE_APP_API_BASE_URL`可获取
```

修改vite启动的vue项目监听的端口和ip，修改vite.config.ts，增加server配置
```js
    server: {
      host: '0.0.0.0',
      port: 4002,
      open: false,
      proxy: {
        '/api': {
          target: viteEnv.VITE_APP_API_BASE_URL,
          changeOrigin: true, // 允许跨域
          rewrite: path => path.replace('/api/', '/'),
        },
      },
    },
```

### 创建docker镜像
创建单独web页面的镜像，通过nginx来部署web页面。

在web文件夹下面创建Dockerfile文件，先编译代码，然后使用nginx来运行
```dockerfile
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
FROM nginx
# 将第一步的dist保存到nignx中
COPY --from=frontend /app/dist /usr/share/nginx/html/
# 配置nginx的配置文件，暴露出80端口
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```
编写nginx的配置文件，需要注意**配置后端node的api转发**
```shell
# nginx/default.conf
server {
    listen       80;
    server_name  localhost;
    #charset koi8-r;
    access_log  /var/log/nginx/host.access.log  main;
    error_log  /var/log/nginx/error.log  error;
    # 这里相当于Vite里配置的代理服务器
    location /api/ {
        # 把路径头上的/api/去掉
        rewrite "^/api/(.*)$" /$1 break;
        # 把请求转发到node服务的3000端口
        proxy_pass http://9.134.53.193:3000/; #转发请求的地址
    }
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }
    #error_page  404              /404.html;

    # redirect server error pages to the static page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

构建镜像
```shell
docker build -t my-web .
```

运行镜像
```
docker run -d --name gpt-web -p 4002:80 my-web
```


## 共同部署
之前介绍了分开部署流程。其实，通过express的中间件，可以把vue直接部署在nodejs的express服务中，只需要在service/src/index/index.ts中，增加`app.use(express.static('public'))`，之后将vue build出来的dist目录下文件拷贝到service/public下面，启动node服务后，请求根目录，可以响应该静态文件目录中的index.html

创建如Dockerfile
构建镜像
```shell
docker build -t my-gpt .
```

运行镜像
```
docker run --name my-gpt --rm -it -p 3000:3000 --env OPENAI_API_KEY=your_api_key my-gpt
```