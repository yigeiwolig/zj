const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const TREES = 'troubleshoot_trees'
const NODES = 'troubleshoot_nodes'
const NODE_TYPES = new Set(['guide', 'choice', 'result'])
const RESULT_TYPES = new Set(['ok', 'fail', 'goto_repair'])

function text(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function bool(value, fallback = true) {
  return value == null ? fallback : value === true
}

function normalizeTags(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || '').split(/[,，\n]/)
  return list.map((item) => text(item, 40)).filter(Boolean).slice(0, 30)
}

function normalizeOptions(value) {
  if (!Array.isArray(value)) return []
  return value.map((option) => ({
    label: text(option && option.label, 40),
    nextNodeId: text(option && option.nextNodeId, 100),
    nextTreeKey: text(option && option.nextTreeKey, 100)
  })).filter((option) => option.label && (option.nextNodeId || option.nextTreeKey)).slice(0, 12)
}

function decorateTree(row) {
  return {
    _id: row._id,
    key: text(row.key || row._id, 100),
    title: text(row.title, 80),
    subtitle: text(row.subtitle, 160),
    cover: text(row.cover, 500),
    sort: Number(row.sort) || 0,
    enabled: row.enabled !== false,
    entryNodeId: text(row.entryNodeId, 100),
    modelTags: normalizeTags(row.modelTags)
  }
}

function decorateNode(row) {
  const type = NODE_TYPES.has(row.type) ? row.type : 'choice'
  const mediaType = row.media && row.media.type === 'image' ? 'image' : 'video'
  return {
    _id: row._id,
    treeId: text(row.treeId, 100),
    type,
    title: text(row.title, 100),
    body: text(row.body, 1000),
    media: {
      type: mediaType,
      url: text(row.media && row.media.url, 1000),
      poster: text(row.media && row.media.poster, 1000)
    },
    options: normalizeOptions(row.options),
    result: RESULT_TYPES.has(row.result) ? row.result : '',
    resultCta: text(row.resultCta, 40),
    sort: Number(row.sort) || 0
  }
}

async function assertAdmin() {
  const openid = cloud.getWXContext().OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data.length) return openid
  const bySystem = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystem.data && bySystem.data.length) return openid
  throw new Error('FORBIDDEN')
}

function isCollectionMissingError(err) {
  const msg = String((err && (err.errMsg || err.message)) || err || '')
  const code = err && (err.errCode || err.code)
  if (code === -502005 || msg.indexOf('-502005') >= 0) return true
  // 索引不存在也会带 "not exist"，绝不能当成集合缺失
  if (/index not exist|索引不存在|请创建索引|suggest index/i.test(msg)) return false
  return /collection not exists|DATABASE_COLLECTION_NOT_EXIST|Db or Table not exist/i.test(msg)
}

function isCollectionAlreadyExistsError(err) {
  const msg = String((err && (err.errMsg || err.message)) || err || '')
  return /already exist|ResourceExist|Table exist|已存在/i.test(msg)
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (err) {
    if (isCollectionAlreadyExistsError(err)) return
    const msg = String((err && (err.errMsg || err.message)) || err || '')
    if (/exist/i.test(msg) && !isCollectionMissingError(err)) return
    throw err
  }
}

async function ensureCollections() {
  await ensureCollection(TREES)
  await ensureCollection(NODES)
}

async function setDoc(collectionName, id, data) {
  try {
    return await db.collection(collectionName).doc(id).set({ data })
  } catch (err) {
    if (!isCollectionMissingError(err)) throw err
    await ensureCollection(collectionName)
    return await db.collection(collectionName).doc(id).set({ data })
  }
}

async function getTreeByIdOrKey(idOrKey) {
  const id = text(idOrKey, 100)
  if (!id) return null
  try {
    const doc = await db.collection(TREES).doc(id).get()
    if (doc && doc.data) return { ...doc.data, _id: id }
  } catch (e) {
    if (isCollectionMissingError(e)) return null
  }
  try {
    const res = await db.collection(TREES).where({ key: id }).limit(1).get()
    return (res.data && res.data[0]) || null
  } catch (e) {
    if (isCollectionMissingError(e)) return null
    throw e
  }
}

async function ensureDefaultSeed() {
  let count = 0
  try {
    const res = await db.collection(TREES).count()
    count = Number(res.total) || 0
  } catch (e) {
    if (isCollectionMissingError(e)) {
      await ensureCollections()
      count = 0
    } else {
      throw e
    }
  }
  if (count > 0) return false

  const now = db.serverDate()
  const treeId = 'btn_no_response'
  const nodes = [
    {
      _id: 'btn_no_response__n1',
      treeId,
      type: 'guide',
      title: '长按按钮 20 秒',
      body: '请按视频演示长按按钮约 20 秒，然后观察指示灯。',
      media: { type: 'video', url: '', poster: '' },
      options: [
        { label: '灯闪烁', nextNodeId: 'btn_no_response__n2', nextTreeKey: '' },
        { label: '灯不闪烁', nextNodeId: 'btn_no_response__n_fail', nextTreeKey: '' }
      ],
      sort: 10,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'btn_no_response__n2',
      treeId,
      type: 'choice',
      title: '指示灯闪烁几次？',
      body: '请重新操作一次，并数清楚灯光连续闪烁的次数。',
      media: { type: 'video', url: '', poster: '' },
      options: [
        { label: '闪 3 次', nextNodeId: 'btn_no_response__n3', nextTreeKey: '' },
        { label: '闪 5 次', nextNodeId: 'btn_no_response__n_free', nextTreeKey: '' }
      ],
      sort: 20,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'btn_no_response__n3',
      treeId,
      type: 'guide',
      title: '长按 8 秒，灯闪后松手',
      body: '按住按钮约 8 秒，看到灯闪烁后立即松开，再测试按钮是否恢复。',
      media: { type: 'video', url: '', poster: '' },
      options: [
        { label: '已经恢复正常', nextNodeId: 'btn_no_response__n_ok', nextTreeKey: '' },
        { label: '仍然没有反应', nextNodeId: 'btn_no_response__n_fail', nextTreeKey: '' }
      ],
      sort: 30,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'btn_no_response__n_free',
      treeId,
      type: 'choice',
      title: '进入下一项排查',
      body: '闪 5 次代表设备已响应，请确认重新上电后是否恢复。',
      media: { type: 'video', url: '', poster: '' },
      options: [
        { label: '恢复正常', nextNodeId: 'btn_no_response__n_ok', nextTreeKey: '' },
        { label: '仍未恢复', nextNodeId: 'btn_no_response__n_fail', nextTreeKey: '' }
      ],
      sort: 40,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'btn_no_response__n_ok',
      treeId,
      type: 'result',
      title: '已恢复正常',
      body: '本次排查已完成，可以继续正常使用。',
      media: { type: 'video', url: '', poster: '' },
      options: [],
      result: 'ok',
      resultCta: '完成',
      sort: 90,
      createTime: now,
      updateTime: now
    },
    {
      _id: 'btn_no_response__n_fail',
      treeId,
      type: 'result',
      title: '需要进一步处理',
      body: '按上述步骤仍未恢复，请进入售后报修并描述灯光状态。',
      media: { type: 'video', url: '', poster: '' },
      options: [],
      result: 'goto_repair',
      resultCta: '去故障报修',
      sort: 100,
      createTime: now,
      updateTime: now
    }
  ]

  await setDoc(TREES, treeId, {
    key: treeId,
    title: '点击按钮没反应？',
    subtitle: '按步骤检查按钮和指示灯状态',
    cover: '',
    sort: 10,
    enabled: true,
    entryNodeId: nodes[0]._id,
    modelTags: [],
    createTime: now,
    updateTime: now
  })
  for (const node of nodes) {
    const data = { ...node }
    delete data._id
    await setDoc(NODES, node._id, data)
  }
  return true
}

async function listTrees(event, isAdmin) {
  await ensureDefaultSeed()
  const model = text(event.model, 40)
  let res
  try {
    res = await db.collection(TREES).limit(100).get()
  } catch (e) {
    if (isCollectionMissingError(e)) {
      await ensureCollections()
      return { ok: true, list: [] }
    }
    throw e
  }
  let list = (res.data || []).map(decorateTree)
  if (!isAdmin) list = list.filter((tree) => tree.enabled)
  if (model) {
    list = list.filter((tree) => !tree.modelTags.length || tree.modelTags.includes(model))
  }
  list.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))
  return { ok: true, list }
}

async function getTree(event, isAdmin) {
  await ensureDefaultSeed()
  const tree = await getTreeByIdOrKey(event.treeId || event.key)
  if (!tree || (!isAdmin && tree.enabled === false)) {
    return { ok: false, errMsg: '排查主题不存在或已停用' }
  }
  let res
  try {
    res = await db.collection(NODES).where({ treeId: tree._id }).limit(100).get()
  } catch (e) {
    if (isCollectionMissingError(e)) {
      await ensureCollection(NODES)
      res = { data: [] }
    } else {
      throw e
    }
  }
  const nodes = (res.data || []).map(decorateNode)
  nodes.sort((a, b) => a.sort - b.sort)
  return { ok: true, tree: decorateTree(tree), nodes }
}

function generatedId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

async function saveTree(event, openid) {
  const input = event.tree || event
  const existingId = text(input._id || event.treeId, 100)
  const key = text(input.key, 100) || existingId || generatedId('tree')
  const id = existingId || key
  const data = {
    key,
    title: text(input.title, 80),
    subtitle: text(input.subtitle, 160),
    cover: text(input.cover, 1000),
    sort: Number(input.sort) || 0,
    enabled: bool(input.enabled, true),
    entryNodeId: text(input.entryNodeId, 100),
    modelTags: normalizeTags(input.modelTags),
    updateTime: db.serverDate(),
    updatedBy: openid
  }
  if (!data.title) return { ok: false, errMsg: '请填写主题名称' }
  if (existingId) {
    try {
      await db.collection(TREES).doc(existingId).update({ data })
    } catch (e) {
      if (!isCollectionMissingError(e)) throw e
      await ensureCollection(TREES)
      await db.collection(TREES).doc(existingId).update({ data })
    }
  } else {
    await setDoc(TREES, id, { ...data, createTime: db.serverDate(), createdBy: openid })
  }
  return { ok: true, treeId: id }
}

async function saveNode(event, openid) {
  const input = event.node || event
  const treeId = text(input.treeId || event.treeId, 100)
  if (!treeId || !(await getTreeByIdOrKey(treeId))) {
    return { ok: false, errMsg: '请选择有效的排查主题' }
  }
  const existingId = text(input._id || event.nodeId, 100)
  const id = existingId || generatedId(`${treeId}__node`)
  const type = NODE_TYPES.has(input.type) ? input.type : 'choice'
  const result = RESULT_TYPES.has(input.result) ? input.result : ''
  const data = {
    treeId,
    type,
    title: text(input.title, 100),
    body: text(input.body, 1000),
    media: {
      type: input.media && input.media.type === 'image' ? 'image' : 'video',
      url: text(input.media && input.media.url, 1000),
      poster: text(input.media && input.media.poster, 1000)
    },
    options: type === 'result' ? [] : normalizeOptions(input.options),
    result: type === 'result' ? (result || 'ok') : '',
    resultCta: type === 'result' ? text(input.resultCta, 40) : '',
    sort: Number(input.sort) || 0,
    updateTime: db.serverDate(),
    updatedBy: openid
  }
  if (!data.title) return { ok: false, errMsg: '请填写节点标题' }
  if (existingId) {
    try {
      await db.collection(NODES).doc(existingId).update({ data })
    } catch (e) {
      if (!isCollectionMissingError(e)) throw e
      await ensureCollection(NODES)
      await db.collection(NODES).doc(existingId).update({ data })
    }
  } else {
    await setDoc(NODES, id, { ...data, createTime: db.serverDate(), createdBy: openid })
  }
  return { ok: true, nodeId: id }
}

async function removeMatching(collection, where) {
  let removed = 0
  for (let round = 0; round < 10; round++) {
    let rows = []
    try {
      const res = await db.collection(collection).where(where).limit(50).get()
      rows = res.data || []
    } catch (e) {
      if (isCollectionMissingError(e)) return removed
      throw e
    }
    if (!rows.length) break
    for (const row of rows) {
      await db.collection(collection).doc(row._id).remove()
      removed += 1
    }
  }
  return removed
}

async function removeTree(event) {
  const tree = await getTreeByIdOrKey(event.treeId || event.key)
  if (!tree) return { ok: false, errMsg: '主题不存在' }
  const nodesRemoved = await removeMatching(NODES, { treeId: tree._id })
  await db.collection(TREES).doc(tree._id).remove()
  return { ok: true, nodesRemoved }
}

async function removeNode(event) {
  const nodeId = text(event.nodeId || event.id, 100)
  if (!nodeId) return { ok: false, errMsg: '缺少节点 ID' }
  await db.collection(NODES).doc(nodeId).remove()
  return { ok: true }
}

exports.main = async (event = {}) => {
  const action = text(event.action || 'listTrees', 40)
  try {
    if (action === 'listTrees') return await listTrees(event, false)
    if (action === 'getTree') return await getTree(event, false)

    const openid = await assertAdmin()
    if (action === 'adminListTrees') return await listTrees(event, true)
    if (action === 'adminGetTree') return await getTree(event, true)
    if (action === 'saveTree') return await saveTree(event, openid)
    if (action === 'saveNode') return await saveNode(event, openid)
    if (action === 'removeTree') return await removeTree(event)
    if (action === 'removeNode') return await removeNode(event)
    if (action === 'seedDefault') {
      const created = await ensureDefaultSeed()
      return { ok: true, created }
    }
    return { ok: false, errMsg: `未知 action: ${action}` }
  } catch (e) {
    const msg = String((e && (e.message || e.errMsg)) || e || '')
    console.error('[troubleshootManage]', action, e)
    if (msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN')) {
      return { ok: false, errMsg: '无管理员权限', code: 'FORBIDDEN' }
    }
    return { ok: false, errMsg: msg || '服务异常' }
  }
}
