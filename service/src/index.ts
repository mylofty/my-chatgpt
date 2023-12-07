import express from 'express'
import * as dotenv from 'dotenv'
import {auth} from './middleware/auth'
import type { RequestProps } from './types'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { log } from 'console'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { ChatMessage } from './chatgpt'

const app = express()
const router = express.Router()
var port = 3000

app.use(express.static('public'))
app.use(express.json()); // 这样请求的req.body才能拿到json

dotenv.config({path:'.env.dev'})
router.get('/', auth, (req, rsp)=>{
  console.log('env is', process.env.AUTH_SECRET_KEY)
  rsp.send({'env':process.env.AUTH_SECRET_KEY})
})


router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      temperature,
      top_p,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')
    console.log(`request token:${token}, type=${typeof token}, real key:${process.env.AUTH_SECRET_KEY},type=${typeof process.env.AUTH_SECRET_KEY}`)
    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

app.use('',router)
app.use('/api', router)

app.listen(port, ()=>{
  console.log('Server is running on port 3000')
 })