// cloudfunctions/adminRegisterSn/index.js
// 管理员在控制中心预登记 SN（不激活、不写质保）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function normalizeSn(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''
  if (raw.startsWith('MT-')) return raw
  if (raw.startsWith('MT')) return `MT-${raw.slice(2).replace(/^-/, '')}`
  if (raw.startsWith('NB')) return `MT-${raw.replace(/^NB-?/, '')}`
  return `MT-${raw.replace(/^-/, '')}`
}

function snCandidates(normalizedSn) {
  const suffix = String(normalizedSn || '').replace(/^MT-?/, '')
  const set = new Set()
  if (normalizedSn) set.add(normalizedSn)
  if (suffix) {
    set.add(suffix)
    set.add(`MT${suffix}`)
    set.add(`NB${suffix}`)
    set.add(`NB-${suffix}`)
  }
  return Array.from(set)
}

function normModel(s) {
  return String(s || '').trim().toUpperCase()
}

function isF3MaxModel(model) {
  return normModel(model) === 'F3 MAX'
}

/** 全新机（库里尚无 sn 档案）预注册 F3 MAX → 自动盖 imu */
function resolveNewRegisterSensorStamp(productModel, existingSnDoc) {
  if (!isF3MaxModel(productModel)) return ''
  if (existingSnDoc && existingSnDoc._id) return ''
  return 'imu'
}

async function assertAdmin(db) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) throw new Error('UNAUTHORIZED')
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data.length > 0) return openid
  const bySystemOpenid = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  if (bySystemOpenid.data.length > 0) return openid
  throw new Error('FORBIDDEN')
}

async function findSnRecord(db, _, normalizedSn) {
  const res = await db.collection('sn').where({ sn: _.in(snCandidates(normalizedSn)) }).get()
  return res.data[0] || null
}

async function findPreRegister(db, _, normalizedSn) {
  const res = await db.collection('guanliyuanSN').where({ sn: _.in(snCandidates(normalizedSn)) }).get()
  return res.data[0] || null
}

async function upsertPreRegister(db, _, normalizedSn, productModel, adminOpenid, sensorStamp) {
  const existing = await db.collection('guanliyuanSN').where({ sn: _.in(snCandidates(normalizedSn)) }).limit(1).get()
  const payload = {
    sn: normalizedSn,
    productModel,
    registeredBy: adminOpenid,
    registeredAt: db.serverDate(),
    source: 'scan_control_center'
  }
  // 仅全新登记写入印章；已有预注册记录不改章（存量不补盖）
  if (sensorStamp && existing.data.length === 0) {
    payload.sensorStamp = sensorStamp
  }
  if (existing.data.length > 0) {
    await db.collection('guanliyuanSN').doc(existing.data[0]._id).update({ data: payload })
    return existing.data[0]._id
  }
  const addRes = await db.collection('guanliyuanSN').add({ data: payload })
  return addRes._id
}

async function upsertInactiveSn(db, normalizedSn, productModel, deviceName, sensorStamp) {
  const _ = db.command
  const existing = await findSnRecord(db, _, normalizedSn)
  const base = {
    sn: normalizedSn,
    name: deviceName || normalizedSn,
    productModel,
    openid: '',
    isActive: false,
    activations: 0,
    updateTime: db.serverDate()
  }
  if (existing) {
    // 系统已有档案：只更新型号等，不盖章、不覆盖已有 sensorStamp
    await db.collection('sn').doc(existing._id).update({
      data: {
        sn: normalizedSn,
        productModel,
        name: base.name,
        openid: '',
        isActive: false,
        preRegistered: true,
        activations: 0,
        expiryDate: _.remove(),
        firmware: _.remove(),
        totalDays: _.remove(),
        remainingDays: _.remove()
      }
    })
    return existing._id
  }
  const addData = { ...base, preRegistered: true, createTime: db.serverDate() }
  if (sensorStamp) addData.sensorStamp = sensorStamp
  const addRes = await db.collection('sn').add({
    data: addData
  })
  return addRes._id
}

async function handleCheck(db, _, normalizedSn, productModel) {
  if (!normalizedSn) {
    return { success: false, msg: '无法识别 SN' }
  }
  if (!productModel) {
    return { success: false, msg: '产品型号无效' }
  }

  const device = await findSnRecord(db, _, normalizedSn)
  const preReg = await findPreRegister(db, _, normalizedSn)

  if (device && device.openid) {
    return {
      success: true,
      showDialog: false,
      reason: device.isActive ? 'user_bound' : 'pending_audit'
    }
  }

  const registeredModel =
    (preReg && preReg.productModel) ||
    (device && device.preRegistered && device.productModel) ||
    ''

  if (registeredModel) {
    if (normModel(registeredModel) === normModel(productModel)) {
      return {
        success: true,
        showDialog: false,
        reason: 'already_registered',
        sn: normalizedSn,
        registeredModel
      }
    }
    return {
      success: true,
      showDialog: true,
      mode: 'change_model',
      sn: normalizedSn,
      existingModel: registeredModel,
      targetModel: productModel
    }
  }

  return {
    success: true,
    showDialog: true,
    mode: 'confirm_new',
    sn: normalizedSn,
    targetModel: productModel
  }
}

async function handleRegister(db, _, normalizedSn, productModel, deviceName, adminOpenid) {
  if (!normalizedSn || !productModel) {
    return { success: false, msg: '参数不完整' }
  }

  const device = await findSnRecord(db, _, normalizedSn)
  if (device && device.openid) {
    if (device.isActive) {
      return { success: false, msg: '该设备已被用户绑定，无法修改登记' }
    }
    return { success: false, msg: '该设备有待审核绑定，请先处理后再预登记' }
  }

  // 全新 F3 MAX 才自动盖 imu；库里已有 sn 档案则不盖
  const sensorStamp = resolveNewRegisterSensorStamp(productModel, device)

  await upsertPreRegister(db, _, normalizedSn, productModel, adminOpenid, sensorStamp)
  await upsertInactiveSn(db, normalizedSn, productModel, deviceName, sensorStamp)

  return {
    success: true,
    msg: '绑定成功',
    sn: normalizedSn,
    productModel,
    sensorStamp: sensorStamp || (device && device.sensorStamp) || ''
  }
}

async function handleListPendingFault(db, _) {
  const pendingRes = await db.collection('sn').where({
    isActive: true,
    snPending: true
  }).limit(50).get()

  const items = pendingRes.data || []
  if (!items.length) {
    return { success: true, data: [] }
  }

  // 关联工单已被删/不存在时，不展示孤儿「待录入 SN」（并清理标记）
  const repairIds = [...new Set(items
    .map((item) => String(item.replacementRepairId || '').trim())
    .filter(Boolean))]
  const liveRepairIds = new Set()
  for (const rid of repairIds) {
    try {
      const repairDoc = await db.collection('shouhou_repair').doc(rid).get()
      const row = repairDoc && repairDoc.data
      if (!row) continue
      const st = String(row.status || '').toUpperCase()
      if (row.deletedByAdmin || row.isDeleted || st === 'DELETED' || st === 'CANCELLED') continue
      liveRepairIds.add(String(rid))
    } catch (e) {
      // doc 不存在 → 视为已删除
    }
  }

  const kept = []
  for (const item of items) {
    const rid = String(item.replacementRepairId || '').trim()
    if (rid && !liveRepairIds.has(rid)) {
      // 工单已不在：撤销待录入，避免列表残留
      try {
        const claimId = String(item.faultClaimId || '').trim()
        const claimSn = claimId
          ? `FAULT-CLAIM-${claimId.slice(-8).toUpperCase()}`
          : ''
        const patch = {
          snPending: false,
          faultAwaitingDiagnosis: true,
          faultAutoBind: false,
          faultScheme: '',
          replacementRepairId: _.remove()
        }
        const curSn = String(item.sn || '').trim().toUpperCase()
        if (claimSn && (item.snPending || curSn.startsWith('PENDING-FAULT-'))) {
          patch.sn = claimSn
        }
        await db.collection('sn').doc(item._id).update({ data: patch })
      } catch (e) {
        console.warn('[adminRegisterSn] cleanup orphan pending failed', item._id, e)
      }
      continue
    }
    kept.push(item)
  }

  const openids = [...new Set(kept.map((item) => item.openid).filter(Boolean))]
  const nickMap = {}
  for (let i = 0; i < openids.length; i += 20) {
    const batch = openids.slice(i, i + 20)
    const userRes = await db.collection('user_list').where({ _openid: _.in(batch) }).get()
    ;(userRes.data || []).forEach((row) => {
      const oid = row._openid || row.openid || ''
      if (oid) nickMap[oid] = row.nickName || row.nickname || ''
    })
  }

  const data = kept
    .map((item) => {
      const userOpenid = String(item.openid || '').trim()
      const userNickname = nickMap[userOpenid] || ''
      return {
        _id: item._id,
        userOpenid,
        userNickname,
        productModel: String(item.productModel || '').trim(),
        placeholderSn: String(item.sn || '').trim(),
        bindTime: item.bindTime || item.createTime || '',
        displayUser: userNickname || `用户 ${userOpenid.slice(-6) || '未知'}`,
        expiryDate: item.expiryDate || '',
        remainingDays: typeof item.remainingDays === 'number' ? item.remainingDays : null,
        totalDays: item.totalDays || null,
        firmware: item.firmware || '',
        replacementRepairId: String(item.replacementRepairId || '').trim()
      }
    })
    .sort((a, b) => String(b.bindTime).localeCompare(String(a.bindTime)))

  return { success: true, data }
}

async function handleListBindTargets(db, _) {
  // 先清掉旧逻辑误标的 awaiting / 误锁，避免控制中心混入无效目标
  try {
    await cloud.callFunction({
      name: 'deviceReplacement',
      data: { action: 'cleanupStale' }
    })
  } catch (e) {
    console.warn('[adminRegisterSn] cleanupStale failed', e)
  }

  const faultResult = await handleListPendingFault(db, _)
  const faultItems = (faultResult.data || []).map((item) => ({
    _id: `fault:${item._id}`,
    targetType: 'fault_pending',
    deviceId: item._id,
    userOpenid: item.userOpenid,
    displayUser: item.displayUser,
    productModel: item.productModel,
    oldSn: '',
    repairId: item.replacementRepairId || '',
    replacementRepairId: item.replacementRepairId || '',
    statusLabel: '待录入',
    statusHint: '同步到用户设备卡'
  }))
  const faultRepairIds = new Set(
    faultItems.map((item) => String(item.replacementRepairId || '').trim()).filter(Boolean)
  )

  let repairItems = []
  try {
    const repairRes = await db.collection('shouhou_repair')
      .where({ awaitingSnReplacement: true })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()

    // 只有管理员明确点击“更换主板”的工单进入控制中心绑定目标。
    // 旧版根据备注关键词自动产生的待换机记录不再展示，避免误判和重复目标。
    const repairs = (repairRes.data || []).filter(
      (repair) => repair.replacementDetectSource === 'manual_board_replacement'
    )
    const openids = [...new Set(repairs.map((r) =>
      r.replacementUserOpenid || r._openid || r.openid || ''
    ).filter(Boolean))]
    const nickMap = {}
    for (let i = 0; i < openids.length; i += 20) {
      const batch = openids.slice(i, i + 20)
      const userRes = await db.collection('user_list').where({ _openid: _.in(batch) }).get()
      ;(userRes.data || []).forEach((row) => {
        const oid = row._openid || row.openid || ''
        if (oid) nickMap[oid] = row.nickName || row.nickname || ''
      })
    }

    repairItems = repairs
      // 同一工单的故障核验待录入与待换机是同一件事，只保留“故障待录入”。
      // 否则控制中心会给同一用户显示两条目标，完成录入后“待换机”还会残留。
      .filter((repair) => !faultRepairIds.has(String(repair._id || '').trim()))
      .map((repair) => {
      const userOpenid = String(
        repair.replacementUserOpenid || repair._openid || repair.openid || ''
      ).trim()
      const userNickname = nickMap[userOpenid] || ''
      const oldSn = String(
        repair.replacementOldSn || (repair.device && repair.device.sn) || ''
      ).trim()
      return {
        _id: `repair:${repair._id}`,
        targetType: 'replacement',
        replacementKind: 'motherboard',
        repairId: repair._id,
        deviceId: '',
        userOpenid,
        displayUser: userNickname || (userOpenid ? `用户 ${userOpenid.slice(-6)}` : '未知用户'),
        productModel: String(repair.model || (repair.device && repair.device.productModel) || '').trim(),
        oldSn,
        statusLabel: '待更换主板',
        statusHint: oldSn ? '旧主板 SN 将失效' : '录入新主板 SN'
      }
      })
  } catch (err) {
    console.warn('[adminRegisterSn] list repairs failed', err)
  }

  const data = [...repairItems, ...faultItems]
  return { success: true, data }
}

async function handleBindUserSn(
  db,
  _,
  normalizedSn,
  productModel,
  deviceName,
  adminOpenid,
  userOpenid,
  pendingDeviceId
) {
  if (!normalizedSn || !userOpenid) {
    return { success: false, msg: '参数不完整' }
  }

  let pendingRes = { data: [] }
  if (pendingDeviceId) {
    try {
      const byId = await db.collection('sn').doc(pendingDeviceId).get()
      const row = byId && byId.data
      if (
        row &&
        String(row.openid || '').trim() === userOpenid &&
        row.isActive === true &&
        row.snPending === true
      ) {
        pendingRes = { data: [row] }
      }
    } catch (e) {
      console.warn('[adminRegisterSn] pending device lookup failed', pendingDeviceId, e)
    }
  }
  if (!pendingRes.data.length) {
    pendingRes = await db.collection('sn').where({
      openid: userOpenid,
      isActive: true,
      snPending: true
    }).limit(1).get()
  }

  if (!pendingRes.data.length) {
    return { success: false, msg: '该用户没有待录入的故障设备' }
  }

  const pending = pendingRes.data[0]
  if (!pending.expiryDate || !pending.totalDays) {
    return { success: false, msg: '该设备尚未完成质保审核，请先在「我的」页审核通过' }
  }
  const model = String(productModel || pending.productModel || '').trim()
  if (!model) {
    return { success: false, msg: '产品型号无效' }
  }

  const conflict = await findSnRecord(db, _, normalizedSn)
  if (conflict && conflict._id !== pending._id) {
    if (conflict.openid && conflict.openid !== userOpenid) {
      return { success: false, msg: '该 SN 已被其他用户绑定' }
    }
    if (conflict.isActive && conflict.openid === userOpenid && !conflict.snPending) {
      // 历史流程可能先生成了一条新 SN 档案，同时遗留故障核验占位档案，
      // 导致同一用户看到两个 SN、控制中心仍显示“待录入”。合并为一条并清理占位档案。
      await db.collection('sn').doc(conflict._id).update({
        data: {
          sn: normalizedSn,
          name: deviceName || normalizedSn,
          productModel: model,
          openid: userOpenid,
          isActive: true,
          snPending: false,
          bindSource: pending.bindSource || 'fault_claim',
          expiryDate: pending.expiryDate,
          totalDays: pending.totalDays,
          remainingDays: pending.remainingDays,
          bindTime: pending.bindTime || conflict.bindTime || db.serverDate(),
          faultClaimId: pending.faultClaimId || conflict.faultClaimId || '',
          replacementRepairId: pending.replacementRepairId || conflict.replacementRepairId || '',
          adminSnAssignedAt: db.serverDate(),
          adminSnAssignedBy: adminOpenid,
          lastBindTime: db.serverDate()
        }
      })
      await db.collection('sn').doc(pending._id).remove()
      await upsertPreRegister(db, _, normalizedSn, model, adminOpenid)

      const relatedRepairId = String(pending.replacementRepairId || '').trim()
      if (relatedRepairId) {
        try {
          await db.collection('shouhou_repair').doc(relatedRepairId).update({
            data: {
              awaitingSnReplacement: false,
              replacementNewSn: normalizedSn,
              replacementCompletedAt: db.serverDate(),
              replacementCompletedBy: adminOpenid
            }
          })
        } catch (e) {
          console.warn('[adminRegisterSn] heal related replacement failed', relatedRepairId, e)
        }
      }
      return {
        success: true,
        msg: '已合并重复设备档案，SN 已同步到用户设备卡',
        sn: normalizedSn,
        productModel: model,
        userOpenid,
        duplicateHealed: true
      }
    }
    if (!conflict.openid) {
      try {
        await db.collection('sn').doc(conflict._id).remove()
      } catch (e) {
        console.warn('[adminRegisterSn] cleanup inactive SN failed', e)
      }
    }
  }

  await upsertPreRegister(db, _, normalizedSn, model, adminOpenid)
  await db.collection('sn').doc(pending._id).update({
    data: {
      sn: normalizedSn,
      name: deviceName || normalizedSn,
      productModel: model,
      snPending: false,
      bindSource: 'fault_claim',
      adminSnAssignedAt: db.serverDate(),
      adminSnAssignedBy: adminOpenid,
      lastBindTime: db.serverDate()
    }
  })

  // 故障核验与同一售后工单曾同时生成“待录入/待换机”时，在录入成功后同步完结工单标记，
  // 避免控制中心下一次仍显示一条“未录入”的重复目标。
  const replacementRepairId = String(pending.replacementRepairId || '').trim()
  if (replacementRepairId) {
    try {
      await db.collection('shouhou_repair').doc(replacementRepairId).update({
        data: {
          awaitingSnReplacement: false,
          replacementNewSn: normalizedSn,
          replacementCompletedAt: db.serverDate(),
          replacementCompletedBy: adminOpenid
        }
      })
    } catch (e) {
      console.warn('[adminRegisterSn] finish related replacement failed', replacementRepairId, e)
    }
  }

  return {
    success: true,
    msg: 'SN 已同步到用户待录入设备',
    sn: normalizedSn,
    productModel: model,
    userOpenid
  }
}

async function handleLookup(db, _, normalizedSn) {
  if (!normalizedSn) {
    return { success: false, msg: '请输入 SN' }
  }

  const device = await findSnRecord(db, _, normalizedSn)
  const preReg = await findPreRegister(db, _, normalizedSn)

  if (!device && !preReg) {
    return { success: false, msg: '未找到该 SN 的登记记录' }
  }

  const productModel =
    (preReg && preReg.productModel) ||
    (device && device.productModel) ||
    ''

  return {
    success: true,
    sn: (device && device.sn) || (preReg && preReg.sn) || normalizedSn,
    productModel: String(productModel || '').trim(),
    isActive: !!(device && device.isActive),
    hasUser: !!(device && device.openid),
    snPending: !!(device && device.snPending),
    preRegistered: !!(device && device.preRegistered) || !!preReg,
    deviceId: (device && device._id) || '',
    preRegId: (preReg && preReg._id) || ''
  }
}

/** 配置回溯：登记历史列表（guanliyuanSN 全量，按时间倒序） */
async function handleListHistory(db, _) {
  const PAGE = 100
  const all = []
  let skip = 0
  for (let round = 0; round < 5; round++) {
    const res = await db.collection('guanliyuanSN')
      .orderBy('registeredAt', 'desc')
      .skip(skip)
      .limit(PAGE)
      .get()
    const rows = res.data || []
    all.push(...rows)
    if (rows.length < PAGE) break
    skip += PAGE
  }

  // 补充 sn 集合的绑定状态
  const snList = [...new Set(all.map((r) => String(r.sn || '').trim()).filter(Boolean))]
  const statusMap = {}
  for (let i = 0; i < snList.length; i += 20) {
    const batch = snList.slice(i, i + 20)
    try {
      const res = await db.collection('sn').where({ sn: _.in(batch) }).get()
      ;(res.data || []).forEach((d) => {
        statusMap[String(d.sn || '').trim()] = {
          hasUser: !!d.openid,
          isActive: !!d.isActive,
          snPending: !!d.snPending,
          deviceModel: String(d.productModel || '').trim()
        }
      })
    } catch (e) {
      console.warn('[adminRegisterSn] history status batch failed', e)
    }
  }

  const data = all.map((r) => {
    const sn = String(r.sn || '').trim()
    const st = statusMap[sn] || {}
    let statusLabel = '未绑定'
    if (st.hasUser) statusLabel = st.isActive ? '已绑定用户' : '待审核'
    if (st.snPending) statusLabel = '待录入'
    return {
      _id: r._id,
      sn,
      productModel: String(r.productModel || '').trim(),
      deviceModel: st.deviceModel || '',
      statusLabel,
      registeredAt: r.registeredAt || null
    }
  })

  return { success: true, data }
}

/** 配置回溯：强制修正 SN 对应的产品型号（管理员手滑点错时用） */
async function handleRollbackModel(db, _, normalizedSn, productModel, adminOpenid) {
  if (!normalizedSn) {
    return { success: false, msg: '请输入 SN' }
  }
  if (!productModel) {
    return { success: false, msg: '请选择正确的产品型号' }
  }

  const device = await findSnRecord(db, _, normalizedSn)
  const preReg = await findPreRegister(db, _, normalizedSn)

  if (!device && !preReg) {
    return { success: false, msg: '未找到该 SN 的登记记录' }
  }

  const oldModel =
    String((preReg && preReg.productModel) || (device && device.productModel) || '').trim()

  if (normModel(oldModel) === normModel(productModel)) {
    return {
      success: true,
      msg: '型号未变化，无需修改',
      sn: normalizedSn,
      productModel,
      oldModel,
      unchanged: true
    }
  }

  await upsertPreRegister(db, _, normalizedSn, productModel, adminOpenid)

  if (device && device._id) {
    await db.collection('sn').doc(device._id).update({
      data: {
        productModel,
        modelRollbackAt: db.serverDate(),
        modelRollbackBy: adminOpenid,
        modelRollbackFrom: oldModel || '',
        updateTime: db.serverDate()
      }
    })
  } else {
    // 仅有预登记、尚无 sn 文档时，补一条未激活档案
    await upsertInactiveSn(db, normalizedSn, productModel, normalizedSn)
  }

  return {
    success: true,
    msg: `已将配置从「${oldModel || '未设置'}」改为「${productModel}」`,
    sn: normalizedSn,
    productModel,
    oldModel,
    unchanged: false
  }
}

exports.main = async (event) => {
  const db = cloud.database()
  const _ = db.command

  try {
    const adminOpenid = await assertAdmin(db)
    const action = event.action || 'check'
    const normalizedSn = normalizeSn(event.sn)
    const productModel = String(event.productModel || '').trim()
    const deviceName = event.deviceName || normalizedSn

    if (action === 'check') {
      return await handleCheck(db, _, normalizedSn, productModel)
    }

    if (action === 'lookup') {
      return await handleLookup(db, _, normalizedSn)
    }

    if (action === 'list_history') {
      return await handleListHistory(db, _)
    }

    if (action === 'rollback_model') {
      return await handleRollbackModel(db, _, normalizedSn, productModel, adminOpenid)
    }

    if (action === 'register' || action === 'update_model') {
      return await handleRegister(db, _, normalizedSn, productModel, deviceName, adminOpenid)
    }

    if (action === 'list_pending_fault') {
      return await handleListPendingFault(db, _)
    }

    if (action === 'list_bind_targets') {
      return await handleListBindTargets(db, _)
    }

    if (action === 'bind_user_sn') {
      const userOpenid = String(event.userOpenid || '').trim()
      const pendingDeviceId = String(event.pendingDeviceId || event.deviceId || '').trim()
      return await handleBindUserSn(
        db,
        _,
        normalizedSn,
        productModel,
        deviceName,
        adminOpenid,
        userOpenid,
        pendingDeviceId
      )
    }

    return { success: false, msg: '未知操作' }
  } catch (err) {
    if (err.message === 'FORBIDDEN' || err.message === 'UNAUTHORIZED') {
      return { success: false, msg: '无管理员权限' }
    }
    console.error('[adminRegisterSn]', err)
    return { success: false, msg: err.message || '操作失败' }
  }
}
