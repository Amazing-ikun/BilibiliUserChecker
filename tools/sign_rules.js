#!/usr/bin/env node
// 用 ECDSA P-256 私钥为 rules/rules.json 生成分离签名 rules/rules.json.sig。
// 签名对象是 LF 归一化后的 UTF-8 字节（GitHub raw 提供的正是这种形式）。

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function arg(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) return fallback
  return process.argv[index + 1]
}

const root = path.resolve(__dirname, '..')
const keyPath = arg('--key', process.env.RULES_SIGNING_KEY)
const rulesPath = path.resolve(arg('--rules', path.join(root, 'rules', 'rules.json')))
const outPath = path.resolve(arg('--out', rulesPath + '.sig'))

if (!keyPath) {
  console.error('usage: node tools/sign_rules.js --key <private-key.pem> [--rules rules.json] [--out rules.json.sig]')
  process.exit(1)
}

const privateKey = crypto.createPrivateKey(fs.readFileSync(path.resolve(keyPath)))
const text = fs.readFileSync(rulesPath).toString('utf8').replace(/\r\n/g, '\n')
const data = Buffer.from(text, 'utf8')
const signature = crypto.sign('sha256', data, {
  key: privateKey,
  dsaEncoding: 'ieee-p1363'
}).toString('base64')

const publicKey = crypto.createPublicKey(privateKey)
const ok = crypto.verify('sha256', data, {
  key: publicKey,
  dsaEncoding: 'ieee-p1363'
}, Buffer.from(signature, 'base64'))
if (!ok) {
  console.error('signature self-check failed')
  process.exit(1)
}

fs.writeFileSync(outPath, signature + '\n')
console.log('signed ' + path.relative(root, rulesPath) + ' -> ' + path.relative(root, outPath))
console.log('public key (SPKI base64):')
console.log(publicKey.export({ type: 'spki', format: 'der' }).toString('base64'))
