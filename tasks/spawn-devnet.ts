import util from 'util'
import fs from 'fs'
import dotenv from 'dotenv'
import { exec } from 'child_process'

const execAsync = util.promisify(exec)

dotenv.config()

const {
  TENDERLY_PROJECT,
  TENDERLY_DEVNET_TEMPLATE,
  TENDERLY_USERNAME,
  TENDERLY_ACCESS_KEY,
} = process.env

const cmd = `tenderly devnet spawn-rpc --project ${TENDERLY_PROJECT} --template ${TENDERLY_DEVNET_TEMPLATE} --account ${TENDERLY_USERNAME} --access_key ${TENDERLY_ACCESS_KEY}`

async function spawnDevnet() {
  const { stderr } = await execAsync(cmd)
  const devNetUrl = stderr.trim().toString()

  console.log('DevNet URL:', devNetUrl)

  if (!fs.existsSync('.env')) fs.writeFileSync('.env', 'utf8')

  const fileContent = fs.readFileSync('.env', 'utf8')

  const newFileContent = fileContent.replace(/DEVNET_RPC_URL=.*/g, '')
  fs.writeFileSync('.env', newFileContent)
  fs.appendFileSync('.env', 'DEVNET_RPC_URL=' + devNetUrl)
}

spawnDevnet()
