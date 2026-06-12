// 云函数：管理员维护官方案例库 video_go（COS 删除复用 getCosUploadUrl）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const MEDIA_FIELDS = ['videoFileID', 'coverFileID', 'videoUrl', 'coverUrl', 'thumbFileID', 'thumbUrl']
const ALLOWED_KEY_RE = /^(video_go|video\/user|case)(\/|$)/

function getEnv(name) {
  return (process.env[name] || '').trim()
}

function normalizeBucket(bucket) {
  const raw = String(bucket || '').trim()
  if (!raw) return ''
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/\.cos\..*$/i, '')
    .replace(/\/+$/g, '')
}

function getCosConfig() {
  const secretId = getEnv('COS_SECRET_ID')
  const secretKey = getEnv('COS_SECRET_KEY')
  const bucket = normalizeBucket(getEnv('COS_BUCKET'))
  const region = getEnv('COS_REGION')
  let publicDomain = getEnv('COS_PUBLIC_DOMAIN')
  if (publicDomain && !/^https?:\/\//i.test(publicDomain)) {
    publicDomain = `https://${publicDomain}`
  }
  return { secretId, secretKey, bucket, region, publicDomain }
}

function isOurCosHost(hostname, cosConfig) {
  const h = String(hostname || '').toLowerCase()
  const bucket = String(cosConfig.bucket || '').toLowerCase()
  const region = String(cosConfig.region || '').toLowerCase()
  if (!h || !bucket) return false

  const hosts = new Set([
    `${bucket}.cos.${region}.myqcloud.com`,
    `${bucket}.cos.accelerate.myqcloud.com`
  ])

  if (cosConfig.publicDomain) {
    try {
      hosts.add(new URL(cosConfig.publicDomain).hostname.toLowerCase())
    } catch (e) { /* ignore */ }
  }

  if (hosts.has(h)) return true
  if (new RegExp(`^${bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.cos\\.ap-[^.]+\\.myqcloud\\.com$`).test(h)) {
    return true
  }
  return /(?:^|\.)myqcloud\.com$/i.test(h) || /tencentcos\.cn$/i.test(h)
}

function isTrustedMediaHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  if (!h) return false
  if (/\.tcb\.qcloud\.la$/i.test(h)) return true
  if (/myqcloud\.com$/i.test(h) || /tencentcos\.cn$/i.test(h)) return true
  return false
}

/** 从路径中提取 COS 对象 Key（兼容 tcb 带环境前缀的路径） */
function normalizeMediaKey(rawPath) {
  if (!rawPath) return null
  let key = decodeURIComponent(String(rawPath).replace(/^\/+/, ''))
  if (!key) return null
  if (ALLOWED_KEY_RE.test(key)) return key
  const match = key.match(/(?:^|\/)(video_go|video\/user|case)\/.+/)
  if (match && match[1]) {
    const idx = key.indexOf(`${match[1]}/`)
    if (idx >= 0) return key.slice(idx)
  }
  return null
}

function extractCosKeyFromUrl(url, cosConfig) {
  if (!url || typeof url !== 'string') return null
  const raw = url.trim()

  // cloud://env-id.xxx/video_go/xxx.mp4
  if (raw.startsWith('cloud://')) {
    const rest = raw.slice('cloud://'.length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx === -1) return null
    return normalizeMediaKey(rest.slice(slashIdx))
  }

  if (!raw.startsWith('http://') && !raw.startsWith('https://')) return null

  try {
    const parsed = new URL(raw)
    const key = normalizeMediaKey(parsed.pathname)
    if (!key) return null

    const host = parsed.hostname.toLowerCase()
    if (/\.tcb\.qcloud\.la$/i.test(host)) return key
    if (isOurCosHost(host, cosConfig)) return key
    if (isTrustedMediaHost(host)) return key

    if (cosConfig.publicDomain) {
      try {
        if (host === new URL(cosConfig.publicDomain).hostname.toLowerCase()) return key
      } catch (e) { /* ignore */ }
    }
    return null
  } catch (e) {
    return null
  }
}

function collectCosKeysFromDoc(doc, cosConfig) {
  if (!doc || typeof doc !== 'object') return []
  const keys = new Set()
  MEDIA_FIELDS.forEach((field) => {
    const key = extractCosKeyFromUrl(doc[field], cosConfig)
    if (key) keys.add(key)
  })
  return [...keys]
}

function collectMediaHints(doc) {
  if (!doc || typeof doc !== 'object') return []
  return MEDIA_FIELDS
    .filter((field) => doc[field])
    .map((field) => {
      const val = String(doc[field])
      return { field, preview: val.length > 72 ? `${val.slice(0, 72)}…` : val }
    })
}

async function deleteCosObjectsViaUploadFn(keys, adminOpenid) {
  const uniqueKeys = [...new Set((keys || []).filter(Boolean))]
  if (!uniqueKeys.length) {
    return { deleted: 0, failed: [], skipped: false }
  }
  const payload = { action: 'deleteObjects', keys: uniqueKeys }
  const internalSecret = getEnv('INTERNAL_CALL_SECRET')
  if (internalSecret) payload._internalSecret = internalSecret
  if (adminOpenid) payload._trustedAdminOpenid = adminOpenid
  try {
    const res = await cloud.callFunction({
      name: 'getCosUploadUrl',
      data: payload
    })
    const result = (res && res.result) || {}
    if (!result.success) {
      return {
        deleted: result.deleted || 0,
        failed: result.failed || uniqueKeys,
        skipped: false,
        message: result.message || 'COS 删除失败'
      }
    }
    return {
      deleted: result.deleted || 0,
      failed: result.failed || [],
      skipped: false
    }
  } catch (err) {
    return {
      deleted: 0,
      failed: uniqueKeys,
      skipped: false,
      message: (err && err.message) || String(err)
    }
  }
}

async function assertAdmin() {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

function isInvalidClientServerDate(val) {
  if (!val || typeof val !== 'object') return false
  if (Object.prototype.toString.call(val) === '[object Date]') return true
  if (val.$date != null) return true
  if (val.type === 'ServerDate') return true
  if (val.constructor && val.constructor.name === 'ServerDate') return true
  return false
}

function normalizeDoc(raw, { forUpdate = false } = {}) {
  if (!raw || typeof raw !== 'object') return {}
  const doc = { ...raw }
  delete doc._id
  delete doc._openid
  delete doc.openid
  delete doc.updateTime
  delete doc.createTime

  Object.keys(doc).forEach((key) => {
    const val = doc[key]
    if (val === null || val === undefined) {
      delete doc[key]
      return
    }
    if (isInvalidClientServerDate(val)) {
      delete doc[key]
      return
    }
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) {
      delete doc[key]
    }
  })

  if (forUpdate) {
    doc.updateTime = db.serverDate()
  }

  return doc
}

exports.main = async (event) => {
  const { action, docId, data, sortList } = event || {}
  let adminOpenid = null

  try {
    adminOpenid = await assertAdmin()
  } catch (e) {
    const msg = String((e && e.message) || e || '')
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { success: false, errMsg: '无管理员权限' }
    }
    return { success: false, errMsg: msg }
  }

  try {
    if (action === 'update') {
      if (!docId) return { success: false, errMsg: '缺少 docId' }
      const patch = normalizeDoc(data, { forUpdate: true })
      if (!Object.keys(patch).length) return { success: false, errMsg: '无有效更新字段' }
      await db.collection('video_go').doc(docId).update({ data: patch })
      return { success: true }
    }

    if (action === 'add') {
      const wxContext = cloud.getWXContext()
      const openid = wxContext.OPENID
      const doc = normalizeDoc(data)
      doc.createTime = db.serverDate()
      try {
        const countRes = await db.collection('video_go').where({ _openid: openid, type: 'admin_upload' }).count()
        doc.applyCount = (countRes.total || 0) + 1
      } catch (countErr) {
        doc.applyCount = doc.applyCount || 1
      }
      const res = await db.collection('video_go').add({ data: doc })
      return { success: true, id: res._id }
    }

    if (action === 'remove') {
      if (!docId) return { success: false, errMsg: '缺少 docId' }

      const cosConfig = getCosConfig()
      let cosKeys = []
      let mediaHints = []
      try {
        const docRes = await db.collection('video_go').doc(docId).get()
        cosKeys = collectCosKeysFromDoc(docRes.data, cosConfig)
        mediaHints = collectMediaHints(docRes.data)
      } catch (readErr) {
        console.warn('[adminUpdateVideoGo] read doc before remove failed:', readErr)
      }

      const cosResult = await deleteCosObjectsViaUploadFn(cosKeys, adminOpenid)
      if (cosKeys.length > 0 && cosResult.failed && cosResult.failed.length > 0) {
        return {
          success: false,
          errMsg: cosResult.message || `COS 文件删除失败（${cosResult.failed.length} 个），数据库记录未删除`
        }
      }

      await db.collection('video_go').doc(docId).remove()
      return {
        success: true,
        cosDeleted: cosResult.deleted || 0,
        cosSkipped: false,
        cosKeysFound: cosKeys,
        mediaHints
      }
    }

    if (action === 'sort') {
      const list = Array.isArray(sortList) ? sortList : []
      await Promise.all(list.map((item, index) => {
        if (!item || !item._id) return Promise.resolve()
        return db.collection('video_go').doc(item._id).update({
          data: { sortOrder: index }
        })
      }))
      return { success: true }
    }

    return { success: false, errMsg: 'Unknown action' }
  } catch (e) {
    return { success: false, errMsg: (e && e.message) || String(e) }
  }
}
