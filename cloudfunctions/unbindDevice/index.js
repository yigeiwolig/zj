const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function normalizeSn(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return ''
  if (isVirtualSn(raw)) return raw
  if (raw.startsWith('MT-')) return raw
  if (raw.startsWith('MT')) return `MT-${raw.slice(2).replace(/^-/, '')}`
  if (raw.startsWith('NB')) return `MT-${raw.replace(/^NB-?/, '')}`
  return `MT-${raw.replace(/^-/, '')}`
}

function snCandidates(normalizedSn) {
  const suffix = String(normalizedSn || '').replace(/^MT-?/, '')
  const set = new Set()
  if (normalizedSn) set.add(normalizedSn)
  if (suffix && !isVirtualSn(normalizedSn)) {
    set.add(suffix)
    set.add(`MT${suffix}`)
    set.add(`NB${suffix}`)
    set.add(`NB-${suffix}`)
  }
  return Array.from(set)
}

function isVirtualSn(sn) {
  const u = String(sn || '').trim().toUpperCase()
  return u.startsWith('PENDING-FAULT-') || u.startsWith('FAULT-CLAIM-')
}

function isDisplaySnLabel(sn) {
  const s = String(sn || '').trim()
  return s === '待录入' || s === '待连接' || s === '待售后确认' || s === '待录入' || s === ''
}

function isValidSnForQuery(sn) {
  if (!sn) return false
  const s = String(sn).trim()
  if (isDisplaySnLabel(s)) return false
  if (s.length < 3) return false
  return true
}

async function isAdmin(db, openid) {
  if (!openid) return false
  const byOpenid = await db.collection('guanliyuan').where({ openid }).limit(1).get()
  if (byOpenid.data && byOpenid.data.length) return true
  const bySystem = await db.collection('guanliyuan').where({ _openid: openid }).limit(1).get()
  return !!(bySystem.data && bySystem.data.length)
}

async function findDevice(db, _, opts) {
  const { deviceId, sn, myOpenid, admin } = opts

  if (deviceId) {
    try {
      const doc = await db.collection('sn').doc(String(deviceId)).get()
      if (doc && doc.data) return doc.data
    } catch (e) {
      /* ignore */
    }
  }

  const rawSn = String(sn || '').trim()
  if (!isValidSnForQuery(rawSn)) {
    if (admin && myOpenid) {
      const byOwner = await db.collection('sn').where({
        openid: myOpenid,
        isActive: true
      }).limit(20).get()
      if (byOwner.data && byOwner.data.length === 1) {
        return byOwner.data[0]
      }
    }
    return null
  }

  const faultVirtual = isVirtualSn(rawSn)
  const normalizedSn = faultVirtual ? rawSn.toUpperCase() : normalizeSn(rawSn)
  const candidates = Array.from(
    new Set([rawSn, rawSn.toUpperCase(), normalizedSn, ...snCandidates(normalizedSn)].filter(Boolean))
  )

  let res
  if (admin) {
    res = await db.collection('sn').where({ sn: _.in(candidates) }).limit(5).get()
  } else {
    res = await db.collection('sn').where({
      sn: _.in(candidates),
      openid: myOpenid
    }).get()
  }

  if (res.data && res.data.length) return res.data[0]

  // 管理员兜底：该用户名下 active 设备（代购配件等待录入等场景 SN 可能异常）
  if (admin && myOpenid && candidates.length === 1 && isVirtualSn(candidates[0])) {
    const byOwner = await db.collection('sn').where({
      openid: myOpenid,
      isActive: true
    }).limit(20).get()
    const hit = (byOwner.data || []).find((row) => {
      const rowSn = String(row.sn || '').toUpperCase()
      return candidates.some((c) => String(c).toUpperCase() === rowSn)
    })
    if (hit) return hit
  }

  return null
}

/**
 * 解绑后清理该用户的残留售后记录（待购配件 / 待寄回）：
 * - 用户已无任何绑定设备 → 全部关闭
 * - 仍有设备 → 只关闭 SN 与剩余设备对不上的记录（无法归属的保留）
 * 已寄出（有运单号 / USER_SENT）的记录不动，避免误关在途售后。
 */
async function cleanupResidualRepairs(db, _, ownerOpenid) {
  if (!ownerOpenid) return { cleaned: 0 }
  try {
    const remainRes = await db.collection('sn').where({
      openid: ownerOpenid,
      isActive: true
    }).limit(50).get()
    const devices = remainRes.data || []

    const recordsRes = await db.collection('shouhou_repair')
      .where({
        _openid: ownerOpenid,
        orphanHidden: _.neq(true)
      })
      .limit(100)
      .get()
    const records = recordsRes.data || []
    if (!records.length) return { cleaned: 0 }

    const deviceSns = new Set()
    devices.forEach((d) => {
      const norm = normalizeSn(d.sn)
      snCandidates(norm).forEach((s) => deviceSns.add(String(s).toUpperCase()))
    })

    let cleaned = 0
    for (const r of records) {
      // 在途售后不动
      const inTransit = (r.status === 'USER_SENT' || r.returnStatus === 'USER_SENT') && r.returnCompleted !== true
      if (inTransit) continue
      if (r.needReturn === true && r.returnCompleted !== true && r.returnTrackingId) continue

      let shouldClean = false
      if (!devices.length) {
        shouldClean = true
      } else {
        const rSn = String(r.sn || r.deviceSn || '').trim()
        if (isValidSnForQuery(rSn) && !isVirtualSn(rSn)) {
          const cands = snCandidates(normalizeSn(rSn)).map((s) => String(s).toUpperCase())
          shouldClean = !cands.some((c) => deviceSns.has(c))
        }
      }
      if (!shouldClean) continue

      const patch = {
        orphanHidden: true,
        needPurchaseParts: false,
        purchasePartsList: [],
        needReturn: false,
        returnCompleted: true,
        autoCleanedOnUnbind: true,
        autoCleanedAt: db.serverDate()
      }
      if (r.status === 'PENDING' || r.status === 'ADMIN_REVIEWED') {
        patch.status = 'COMPLETED'
      }
      await db.collection('shouhou_repair').doc(r._id).update({ data: patch })
      cleaned++
    }
    console.log('[unbindDevice] 残留售后清理：', { ownerOpenid: ownerOpenid.slice(0, 8) + '***', devicesLeft: devices.length, cleaned })
    return { cleaned }
  } catch (e) {
    console.warn('[unbindDevice] 残留售后清理失败（不影响解绑）：', e.message || e)
    return { cleaned: 0 }
  }
}

/** 管理员强制解绑：清空归属与锁定状态，保留 SN 档案便于再绑 */
async function forceUnbindByAdmin(db, _, device, candidates) {
  const patch = {
    openid: '',
    isActive: false,
    snPending: false,
    deviceStatus: 'unbound',
    snLocked: false,
    snLockReason: '',
    faultAutoBind: false,
    faultAwaitingDiagnosis: false
  }
  await db.collection('sn').doc(device._id).update({ data: patch })
  const snList = candidates && candidates.length
    ? candidates
    : [device.sn].filter(Boolean)
  if (snList.length) {
    try {
      await db.collection('my_read').where({ sn: _.in(snList) }).remove()
    } catch (e) {
      /* ignore */
    }
  }
  return { success: true, msg: '管理员已强制解绑并移除设备' }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const admin = await isAdmin(db, myOpenid)

  try {
    const deviceId = String(event.deviceId || '').trim()
    const rawSn = String(event.sn || '').trim()

    const validSn = isValidSnForQuery(rawSn)
    
    console.log('[unbindDevice] 收到请求：', {
      deviceId,
      rawSn,
      validSn,
      myOpenid: myOpenid ? myOpenid.slice(0, 8) + '***' : '',
      admin
    })

    if (!deviceId && !validSn) {
      if (admin && myOpenid) {
        const fallback = await db.collection('sn').where({
          openid: myOpenid,
          isActive: true
        }).limit(20).get()
        if (fallback.data && fallback.data.length === 1) {
          console.log('[unbindDevice] 管理员单设备兜底匹配')
          const device = fallback.data[0]
          const fallbackOwner = String(device.openid || '').trim()
          const result = await forceUnbindByAdmin(db, _, device, [device.sn].filter(Boolean))
          if (result.success && fallbackOwner) {
            await cleanupResidualRepairs(db, _, fallbackOwner)
          }
          return result
        }
      }
      return { success: false, msg: '缺少有效设备标识（SN 为展示文案，无法查询）' }
    }

    const device = await findDevice(db, _, {
      deviceId,
      sn: rawSn,
      myOpenid,
      admin
    })

    console.log('[unbindDevice] 查找设备结果：', device ? {
      _id: device._id,
      sn: device.sn,
      openid: device.openid ? device.openid.slice(0, 8) + '***' : ''
    } : 'NOT_FOUND')

    if (!device) {
      const hint = deviceId
        ? `设备 ID ${deviceId} 不存在，可能已被删除`
        : `SN ${rawSn} 不存在或已被删除`
      return {
        success: false,
        msg: admin ? `${hint}（管理员已部署最新云函数）` : '无权操作或设备不存在'
      }
    }

    const ownerOpenid = String(device.openid || '').trim()
    const isOwner = ownerOpenid && ownerOpenid === myOpenid
    if (!admin && !isOwner) {
      return { success: false, msg: '无权操作或设备不存在' }
    }

    const faultVirtual = isVirtualSn(rawSn || device.sn)
    const normalizedSn = faultVirtual
      ? String(device.sn || rawSn).trim().toUpperCase()
      : normalizeSn(rawSn || device.sn)
    const candidates = Array.from(
      new Set([rawSn, rawSn.toUpperCase(), normalizedSn, device.sn, ...snCandidates(normalizedSn)].filter(Boolean))
    )

    if (admin) {
      const result = await forceUnbindByAdmin(db, _, device, candidates)
      if (result.success && ownerOpenid) {
        await cleanupResidualRepairs(db, _, ownerOpenid)
      }
      return result
    }

    if (device.isActive) {
      if (device.snPending || faultVirtual) {
        await db.collection('sn').doc(device._id).update({
          data: {
            openid: '',
            isActive: false,
            snPending: false,
            deviceStatus: 'unbound',
            faultAutoBind: false,
            faultAwaitingDiagnosis: false
          }
        })
        await cleanupResidualRepairs(db, _, myOpenid)
        return { success: true, msg: '解绑成功，设备已移除' }
      }
      await db.collection('sn').doc(device._id).update({
        data: {
          sn: normalizedSn || device.sn,
          openid: ''
        }
      })
      await cleanupResidualRepairs(db, _, myOpenid)
      return { success: true, msg: '解绑成功，设备已释放' }
    }

    await db.collection('sn').doc(device._id).remove()
    if (candidates.length) {
      await db.collection('my_read').where({ sn: _.in(candidates) }).remove()
    }
    await cleanupResidualRepairs(db, _, myOpenid)
    return { success: true, msg: '绑定记录已清除' }
  } catch (err) {
    return { success: false, msg: err.message || err.errMsg || '解绑失败' }
  }
}
