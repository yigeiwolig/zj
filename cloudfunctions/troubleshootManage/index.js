const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const TREES = 'troubleshoot_trees'
const NODES = 'troubleshoot_nodes'
const QUESTIONS = 'help_series_questions'
const REPORTS = 'troubleshoot_reports'
const NODE_TYPES = new Set(['guide', 'choice', 'result'])
const RESULT_TYPES = new Set(['ok', 'fail', 'goto_repair'])
const SERIES_LIST = ['F1', 'F2', 'F2 Long', 'F3']
const SAMPLE_QUESTION_TITLES = ['点击没反应？', '电机不转动', '设备没反应']

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
  // 只要有文案就保留；允许先写答案、稍后再接下一步（next 可为空）
  return value.map((option) => ({
    label: text(option && option.label, 40),
    nextNodeId: text(option && option.nextNodeId, 100),
    nextTreeKey: text(option && option.nextTreeKey, 100),
    requireUserVideo: !!(option && option.requireUserVideo)
  })).filter((option) => !!option.label).slice(0, 12)
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

function normalizeKeyPoints(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (typeof item === 'string') {
      const title = text(item, 40)
      return title ? { title, detail: '' } : null
    }
    const title = text(item && (item.title || item.text), 80)
    const detail = text(item && item.detail, 200)
    if (!title && !detail) return null
    return { title: title || detail, detail: title ? detail : '' }
  }).filter(Boolean).slice(0, 8)
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
    keyPoints: normalizeKeyPoints(row.keyPoints),
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
  await ensureCollection(QUESTIONS)
  await ensureCollection(REPORTS)
}

function generatedId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

function visibleSeriesOf(row) {
  const listed = Array.isArray(row && row.visibleSeries)
    ? row.visibleSeries.map((item) => text(item, 40)).filter((item) => SERIES_LIST.includes(item))
    : []
  if (listed.length) return listed
  if (row && row.syncAll) return SERIES_LIST.slice()
  const series = text(row && row.series, 40)
  return SERIES_LIST.includes(series) ? [series] : []
}

function isSyncAllVisible(visible) {
  return SERIES_LIST.every((name) => visible.includes(name))
}

function decorateQuestion(row) {
  const visibleSeries = visibleSeriesOf(row)
  return {
    _id: row._id,
    series: text(row.series, 40),
    title: text(row.title, 80),
    treeId: text(row.treeId, 100),
    sort: Number(row.sort) || 0,
    enabled: row.enabled !== false,
    relatedPoint: !!row.relatedPoint,
    visibleSeries,
    syncAll: isSyncAllVisible(visibleSeries)
  }
}

function slugPart(value) {
  return text(value, 40).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5-]/gi, '') || 'q'
}

function questionMatchesSeries(row, series) {
  if (!series) return true
  return visibleSeriesOf(row).includes(series)
}

async function syncTreeModelTags(treeId, visibleSeries) {
  if (!treeId) return
  const tags = Array.isArray(visibleSeries) && visibleSeries.length
    ? visibleSeries.slice()
    : []
  try {
    await db.collection(TREES).doc(treeId).update({
      data: {
        modelTags: tags,
        updateTime: db.serverDate()
      }
    })
  } catch (e) { /* ignore */ }
}

async function createEmptyTreeWithEntry(openid, title, series, sort) {
  const treeId = generatedId(`help_${slugPart(series)}`)
  const entryId = `${treeId}__n_entry`
  const now = db.serverDate()
  await setDoc(TREES, treeId, {
    key: treeId,
    title: text(title, 80) || '新排查问题',
    subtitle: '',
    cover: '',
    sort: Number(sort) || 0,
    enabled: true,
    entryNodeId: entryId,
    modelTags: series ? [series] : [],
    createTime: now,
    updateTime: now,
    createdBy: openid || '',
    updatedBy: openid || ''
  })
  await setDoc(NODES, entryId, {
    treeId,
    type: 'guide',
    title: '请按提示操作',
    body: '请在管理员模式下补充本步骤说明与视频，并添加后续选项。',
    media: { type: 'video', url: '', poster: '' },
    options: [
      { label: '已按要求操作', nextNodeId: `${treeId}__n_ok`, nextTreeKey: '' },
      { label: '仍然不行', nextNodeId: `${treeId}__n_fail`, nextTreeKey: '' }
    ],
    result: '',
    resultCta: '',
    sort: 10,
    createTime: now,
    updateTime: now,
    createdBy: openid || ''
  })
  await setDoc(NODES, `${treeId}__n_ok`, {
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
    updateTime: now,
    createdBy: openid || ''
  })
  await setDoc(NODES, `${treeId}__n_fail`, {
    treeId,
    type: 'result',
    title: '需要进一步处理',
    body: '按上述步骤仍未恢复，请进入售后报修。',
    media: { type: 'video', url: '', poster: '' },
    options: [],
    result: 'goto_repair',
    resultCta: '去故障报修',
    sort: 100,
    createTime: now,
    updateTime: now,
    createdBy: openid || ''
  })
  return treeId
}

async function createSampleTree(series, title, sortIndex) {
  const treeId = `help_${slugPart(series)}_${slugPart(title)}_${sortIndex}`
  const n1 = `${treeId}__n1`
  const n2 = `${treeId}__n2`
  const nOk = `${treeId}__n_ok`
  const nFail = `${treeId}__n_fail`
  const now = db.serverDate()
  const nodes = [
    {
      _id: n1,
      treeId,
      type: 'guide',
      title: title,
      body: `对照演示视频排查 ${series}，选择对应状态；按指引完成故障记录。`,
      media: { type: 'video', url: '', poster: '' },
      options: [
        { label: '现象有改善', nextNodeId: n2, nextTreeKey: '' },
        { label: '完全没变化', nextNodeId: nFail, nextTreeKey: '' }
      ],
      sort: 10,
      createTime: now,
      updateTime: now
    },
    {
      _id: n2,
      treeId,
      type: 'choice',
      title: '重新上电后再试一次？',
      body: '断电 10 秒后重新上电，再观察是否恢复。',
      media: { type: 'video', url: '', poster: '' },
      options: [
        { label: '已经恢复', nextNodeId: nOk, nextTreeKey: '' },
        { label: '仍未恢复', nextNodeId: nFail, nextTreeKey: '' }
      ],
      sort: 20,
      createTime: now,
      updateTime: now
    },
    {
      _id: nOk,
      treeId,
      type: 'result',
      title: '已恢复正常',
      body: '事例排查结束。你可以在管理端替换真实步骤与视频。',
      media: { type: 'video', url: '', poster: '' },
      options: [],
      result: 'ok',
      resultCta: '完成',
      sort: 90,
      createTime: now,
      updateTime: now
    },
    {
      _id: nFail,
      treeId,
      type: 'result',
      title: '建议申请售后',
      body: '事例流程走到此说明仍需人工处理，可前往故障报修。',
      media: { type: 'video', url: '', poster: '' },
      options: [],
      result: 'goto_repair',
      resultCta: '去故障报修',
      sort: 100,
      createTime: now,
      updateTime: now
    }
  ]
  await Promise.all([
    setDoc(TREES, treeId, {
      key: treeId,
      title,
      subtitle: `${series} · 事例排查`,
      cover: '',
      sort: sortIndex * 10,
      enabled: true,
      entryNodeId: n1,
      modelTags: [series],
      createTime: now,
      updateTime: now
    }),
    ...nodes.map((node) => {
      const data = { ...node }
      delete data._id
      return setDoc(NODES, node._id, data)
    })
  ])
  return treeId
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
  let existing = null
  if (existingId) {
    try {
      const snap = await db.collection(NODES).doc(existingId).get()
      existing = (snap && snap.data) || null
    } catch (e) {
      existing = null
    }
  }
  const incomingKeyPoints = input.keyPoints
  const keyPoints = type === 'result'
    ? []
    : normalizeKeyPoints(
      incomingKeyPoints == null && existing
        ? existing.keyPoints
        : incomingKeyPoints
    )
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
    keyPoints,
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

async function ensureHelpQaSeed(seriesOnly) {
  await ensureCollections()
  const targets = seriesOnly && SERIES_LIST.includes(seriesOnly)
    ? [seriesOnly]
    : SERIES_LIST

  let created = 0
  for (const series of targets) {
    let existing = []
    try {
      const all = await db.collection(QUESTIONS).limit(200).get()
      existing = (all.data || []).filter((row) => questionMatchesSeries(row, series))
    } catch (e) {
      if (isCollectionMissingError(e)) {
        await ensureCollection(QUESTIONS)
        existing = []
      } else {
        throw e
      }
    }
    if (existing.length) continue

    const now = db.serverDate()
    // 同一系列 3 条事例并行写入，避免整包 12 棵树拖垮超时
    const jobs = SAMPLE_QUESTION_TITLES.map(async (title, i) => {
      const treeId = await createSampleTree(series, title, i + 1)
      const qid = `hq_${slugPart(series)}_${i + 1}`
      await setDoc(QUESTIONS, qid, {
        series,
        title,
        treeId,
        sort: (i + 1) * 10,
        enabled: true,
        syncAll: false,
        visibleSeries: [series],
        createTime: now,
        updateTime: now
      })
      return 1
    })
    const results = await Promise.all(jobs)
    created += results.length
  }
  return { created: created > 0, count: created }
}

function pickSyncedQuestion(list) {
  const preferred = new Map()
  list.forEach((q) => {
    const vis = (q.visibleSeries || []).length
    const prev = preferred.get(q.title)
    if (!prev || vis > (prev.visibleSeries || []).length || (vis === (prev.visibleSeries || []).length && q.syncAll && !prev.syncAll)) {
      preferred.set(q.title, q)
    }
  })
  return list.filter((q) => {
    const keep = preferred.get(q.title)
    return keep && keep._id === q._id
  })
}

async function listQuestions(event, isAdmin) {
  const series = text(event.series, 40)
  const relatedOnly = !!event.relatedOnly
  // 只种子当前系列（约 3 棵树），避免一次写满四系列超时；关联点列表不触发种子
  if (!relatedOnly) {
    try {
      await ensureHelpQaSeed(series || '')
    } catch (seedErr) {
      console.error('[troubleshootManage] ensureHelpQaSeed', seedErr)
    }
  }

  let res
  try {
    if (series) {
      try {
        res = await db.collection(QUESTIONS).where(_.or([
          { series },
          { syncAll: true }
        ])).limit(200).get()
      } catch (e) {
        const all = await db.collection(QUESTIONS).limit(200).get()
        res = { data: (all.data || []).filter((row) => questionMatchesSeries(row, series)) }
      }
    } else {
      res = await db.collection(QUESTIONS).limit(200).get()
    }
  } catch (e) {
    if (isCollectionMissingError(e)) {
      await ensureCollection(QUESTIONS)
      return { ok: true, list: [] }
    }
    throw e
  }
  let list = (res.data || []).map(decorateQuestion)
  if (!isAdmin) list = list.filter((q) => q.enabled && q.treeId)
  if (series) list = list.filter((q) => questionMatchesSeries(q, series))
  if (relatedOnly) list = list.filter((q) => q.relatedPoint)
  list = pickSyncedQuestion(list)
  list.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))
  return { ok: true, list, seriesList: SERIES_LIST }
}

async function createQuestion(event, openid) {
  const series = text(event.series, 40)
  const title = text(event.title, 80)
  const syncAll = bool(event.syncAll, false)
  if (!SERIES_LIST.includes(series)) return { ok: false, errMsg: '无效系列' }
  if (!title) return { ok: false, errMsg: '请填写问题标题' }
  const visibleSeries = syncAll ? SERIES_LIST.slice() : [series]
  const sort = Number(event.sort) || Date.now() % 100000
  const treeId = await createEmptyTreeWithEntry(openid, title, series, sort)
  const id = generatedId(`hq_${slugPart(series)}`)
  await setDoc(QUESTIONS, id, {
    series,
    title,
    treeId,
    sort,
    enabled: true,
    relatedPoint: false,
    syncAll,
    visibleSeries,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
    createdBy: openid
  })
  await syncTreeModelTags(treeId, visibleSeries)
  return { ok: true, questionId: id, treeId, question: decorateQuestion({ _id: id, series, title, treeId, sort, enabled: true, relatedPoint: false, syncAll, visibleSeries }) }
}

async function updateQuestion(event, openid) {
  const id = text(event.questionId || event.id || (event.question && event.question._id), 100)
  if (!id) return { ok: false, errMsg: '缺少问题 ID' }
  let row
  try {
    const doc = await db.collection(QUESTIONS).doc(id).get()
    row = doc && doc.data
  } catch (e) {
    return { ok: false, errMsg: '问题不存在' }
  }
  if (!row) return { ok: false, errMsg: '问题不存在' }
  const title = text(event.title != null ? event.title : row.title, 80)
  const sort = event.sort != null ? Number(event.sort) || 0 : Number(row.sort) || 0
  const enabled = event.enabled != null ? bool(event.enabled, true) : row.enabled !== false
  const relatedPoint = event.relatedPoint != null ? bool(event.relatedPoint, false) : !!row.relatedPoint
  let visibleSeries = visibleSeriesOf(row)
  if (event.syncAll != null) {
    const series = text(event.series, 40) || text(row.series, 40)
    visibleSeries = bool(event.syncAll, false)
      ? SERIES_LIST.slice()
      : (SERIES_LIST.includes(series) ? [series] : visibleSeries.slice(0, 1))
  }
  const syncAll = isSyncAllVisible(visibleSeries)
  if (!title) return { ok: false, errMsg: '请填写问题标题' }
  const patch = {
    title,
    sort,
    enabled,
    relatedPoint,
    syncAll,
    visibleSeries,
    updateTime: db.serverDate(),
    updatedBy: openid
  }
  await db.collection(QUESTIONS).doc(id).update({ data: patch })
  await syncTreeModelTags(row.treeId, visibleSeries)
  if (row.treeId && title !== row.title) {
    try {
      await db.collection(TREES).doc(row.treeId).update({
        data: { title, updateTime: db.serverDate(), updatedBy: openid }
      })
    } catch (e) { /* ignore */ }
  }
  return {
    ok: true,
    question: decorateQuestion({
      _id: id,
      series: row.series,
      title,
      treeId: row.treeId,
      sort,
      enabled,
      relatedPoint,
      syncAll,
      visibleSeries
    })
  }
}

async function hardDeleteQuestionRow(row) {
  let nodesRemoved = 0
  const id = row && row._id
  if (!id) return 0
  if (row.treeId) {
    try {
      const removed = await removeTree({ treeId: row.treeId })
      nodesRemoved = (removed && removed.nodesRemoved) || 0
    } catch (e) { /* ignore */ }
  }
  try {
    await db.collection(QUESTIONS).doc(id).remove()
  } catch (e) {
    throw e
  }
  return nodesRemoved
}

async function removeQuestion(event) {
  const id = text(event.questionId || event.id, 100)
  const fromSeries = text(event.series, 40)
  const scope = text(event.scope, 20) === 'all' ? 'all' : 'series'
  if (!id) return { ok: false, errMsg: '缺少问题 ID' }
  let row
  try {
    const doc = await db.collection(QUESTIONS).doc(id).get()
    row = doc && doc.data ? { ...doc.data, _id: id } : null
  } catch (e) {
    return { ok: false, errMsg: '问题不存在' }
  }
  if (!row) return { ok: false, errMsg: '问题不存在' }

  if (scope === 'all') {
    let nodesRemoved = 0
    const title = text(row.title, 80)
    try {
      const all = await db.collection(QUESTIONS).limit(200).get()
      const twins = (all.data || []).filter((item) => {
        const itemId = item._id
        return itemId !== id && title && text(item.title, 80) === title
      })
      for (const twin of twins) {
        try {
          nodesRemoved += await hardDeleteQuestionRow({ ...twin, _id: twin._id })
        } catch (e) { /* continue */ }
      }
    } catch (e) { /* ignore twins */ }
    try {
      nodesRemoved += await hardDeleteQuestionRow(row)
    } catch (e) {
      return { ok: false, errMsg: '删除失败' }
    }
    return { ok: true, removedAll: true, nodesRemoved }
  }

  let visibleSeries = visibleSeriesOf(row)
  if (fromSeries && SERIES_LIST.includes(fromSeries)) {
    visibleSeries = visibleSeries.filter((name) => name !== fromSeries)
  } else {
    visibleSeries = []
  }

  if (visibleSeries.length) {
    const syncAll = isSyncAllVisible(visibleSeries)
    await db.collection(QUESTIONS).doc(id).update({
      data: {
        visibleSeries,
        syncAll,
        updateTime: db.serverDate()
      }
    })
    await syncTreeModelTags(row.treeId, visibleSeries)
    return { ok: true, removedAll: false, visibleSeries }
  }

  try {
    const nodesRemoved = await hardDeleteQuestionRow(row)
    return { ok: true, removedAll: true, nodesRemoved }
  } catch (e) {
    return { ok: false, errMsg: '删除失败' }
  }
}

async function submitReport(event, openid) {
  const resultType = text(event.result, 20) || 'goto_repair'
  // 正常结束不落库、不推管理员（客户端也应直接丢弃）
  if (resultType === 'ok') {
    return { ok: true, discarded: true }
  }
  if (resultType !== 'goto_repair' && resultType !== 'fail') {
    return { ok: false, errMsg: '结束类型无效' }
  }

  const steps = Array.isArray(event.steps)
    ? event.steps.slice(0, 20).map((step) => ({
      nodeId: text(step && step.nodeId, 100),
      title: text(step && step.title, 100),
      answer: text(step && step.answer, 80),
      requireUserVideo: !!(step && step.requireUserVideo),
      videoUrl: text(step && step.videoUrl, 1000)
    })).filter((step) => !!step.answer || !!step.title)
    : []
  if (!steps.length) return { ok: false, errMsg: '没有排查记录' }
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].requireUserVideo && !steps[i].videoUrl) {
      return { ok: false, errMsg: '有步骤尚未录制视频' }
    }
  }
  await ensureCollection(REPORTS)
  const id = generatedId('tsr')
  await setDoc(REPORTS, id, {
    treeId: text(event.treeId, 100),
    treeTitle: text(event.treeTitle, 80),
    model: text(event.model, 40),
    result: resultType,
    steps,
    status: 'pending',
    openid,
    _openid: openid,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  })
  return { ok: true, reportId: id }
}

async function listReports(event) {
  await ensureCollection(REPORTS)
  const status = text(event.status, 20) || 'pending'
  const res = await db.collection(REPORTS)
    .where({ status })
    .orderBy('createTime', 'desc')
    .limit(50)
    .get()
  return { ok: true, list: res.data || [] }
}

async function deleteReportVideo(event, openid) {
  const id = text(event.reportId || event.id, 100)
  const stepIndex = Number(event.stepIndex)
  if (!id || Number.isNaN(stepIndex) || stepIndex < 0) {
    return { ok: false, errMsg: '参数错误' }
  }
  const snap = await db.collection(REPORTS).doc(id).get()
  const row = snap && snap.data
  if (!row) return { ok: false, errMsg: '记录不存在' }
  const steps = Array.isArray(row.steps) ? row.steps.map((s) => ({ ...s })) : []
  if (!steps[stepIndex]) return { ok: false, errMsg: '找不到这一步' }
  steps[stepIndex].videoUrl = ''
  const hasVideoLeft = steps.some((s) => !!(s && String(s.videoUrl || '').trim()))
  const patch = {
    steps,
    reviewedBy: openid,
    updateTime: db.serverDate()
  }
  // 没有剩余视频：移出待处理，管理员列表不再展示该卡
  if (!hasVideoLeft) {
    patch.status = 'dismissed'
    patch.dismissedAt = db.serverDate()
  }
  await db.collection(REPORTS).doc(id).update({ data: patch })
  return { ok: true, dismissed: !hasVideoLeft }
}

async function askRepair(event, openid) {
  const id = text(event.reportId || event.id, 100)
  if (!id) return { ok: false, errMsg: '参数错误' }
  const snap = await db.collection(REPORTS).doc(id).get()
  const row = snap && snap.data
  if (!row) return { ok: false, errMsg: '记录不存在' }
  await db.collection(REPORTS).doc(id).update({
    data: {
      status: 'ask_repair',
      repairNotice: true,
      repairNoticeTime: db.serverDate(),
      reviewedBy: openid,
      updateTime: db.serverDate()
    }
  })
  let notify = { success: false }
  try {
    const userOpenid = text(row.openid || row._openid, 100)
    if (userOpenid) {
      const model = text(row.model, 20)
      const callRes = await cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: {
          openid: userOpenid,
          scene: 'ts_ask_repair',
          page: 'package-extra/pages/faq/faq',
          thing2: '排查售后已回复',
          phrase37: '待申报',
          thing6: model ? `${model}请前往维修中心申报` : '请到「常见问题」查看并申报'
        }
      })
      notify = (callRes && callRes.result) || notify
    }
  } catch (e) {
    notify = { success: false, errMsg: (e && (e.errMsg || e.message)) || 'notify fail' }
  }
  return { ok: true, notify }
}

async function listMyRepairNotice(userOpenid) {
  await ensureCollection(REPORTS)
  const res = await db.collection(REPORTS)
    .where({
      openid: userOpenid,
      repairNotice: true,
      status: 'ask_repair'
    })
    .orderBy('updateTime', 'desc')
    .limit(5)
    .get()
  return { ok: true, list: res.data || [] }
}

async function ackRepairNotice(event, userOpenid) {
  const id = text(event.reportId || event.id, 100)
  if (!id) return { ok: false, errMsg: '参数错误' }
  await db.collection(REPORTS).doc(id).update({
    data: {
      repairNotice: false,
      updateTime: db.serverDate()
    }
  })
  return { ok: true }
}

exports.main = async (event = {}) => {
  const action = text(event.action || 'listTrees', 40)
  try {
    if (action === 'listTrees') return await listTrees(event, false)
    if (action === 'getTree') return await getTree(event, false)
    if (action === 'listQuestions') return await listQuestions(event, false)
    if (action === 'submitReport') {
      const openid = cloud.getWXContext().OPENID
      if (!openid) return { ok: false, errMsg: '请先登录' }
      return await submitReport(event, openid)
    }
    if (action === 'listMyRepairNotice') {
      const openid = cloud.getWXContext().OPENID
      if (!openid) return { ok: false, errMsg: '请先登录' }
      return await listMyRepairNotice(openid)
    }
    if (action === 'ackRepairNotice') {
      const openid = cloud.getWXContext().OPENID
      if (!openid) return { ok: false, errMsg: '请先登录' }
      return await ackRepairNotice(event, openid)
    }

    const openid = await assertAdmin()
    if (action === 'adminListTrees') return await listTrees(event, true)
    if (action === 'adminGetTree') return await getTree(event, true)
    if (action === 'adminListQuestions') return await listQuestions(event, true)
    if (action === 'createQuestion') return await createQuestion(event, openid)
    if (action === 'updateQuestion') return await updateQuestion(event, openid)
    if (action === 'removeQuestion') return await removeQuestion(event)
    if (action === 'saveTree') return await saveTree(event, openid)
    if (action === 'saveNode') return await saveNode(event, openid)
    if (action === 'listReports') return await listReports(event)
    if (action === 'deleteReportVideo') return await deleteReportVideo(event, openid)
    if (action === 'askRepair') return await askRepair(event, openid)
    if (action === 'removeTree') return await removeTree(event)
    if (action === 'removeNode') return await removeNode(event)
    if (action === 'seedDefault') {
      const created = await ensureDefaultSeed()
      return { ok: true, created }
    }
    if (action === 'seedHelpQa') {
      const result = await ensureHelpQaSeed(text(event.series, 40))
      return { ok: true, ...result }
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
